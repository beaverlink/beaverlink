import { describe, expect, it, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import App from '../App'
import { AuthProvider } from './AuthProvider'

const authMocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  signInEmail: vi.fn(),
  signUpEmail: vi.fn(),
  signOut: vi.fn(),
  requestPasswordReset: vi.fn(),
  resetPassword: vi.fn(),
}))

vi.mock('./authClient', async () => {
  const React = await import('react')

  type MockSession = {
    user: {
      id: string
      name: string
      email: string
    }
    session: object
  } | null

  return {
    authClient: {
      useSession: () => {
        const [data, setData] = React.useState<MockSession>(null)
        const [isPending, setIsPending] = React.useState(true)

        const refetch = React.useCallback(async () => {
          setIsPending(true)

          try {
            const result = await authMocks.getSession()
            setData(result.error ? null : result.data)
          } catch {
            setData(null)
          } finally {
            setIsPending(false)
          }
        }, [])

        React.useEffect(() => {
          const timer = setTimeout(() => {
            void refetch()
          }, 0)

          return () => clearTimeout(timer)
        }, [refetch])

        return {
          data,
          isPending,
          refetch,
        }
      },

      getSession: authMocks.getSession,
      signIn: { email: authMocks.signInEmail },
      signUp: { email: authMocks.signUpEmail },
      signOut: authMocks.signOut,
      requestPasswordReset: authMocks.requestPasswordReset,
      resetPassword: authMocks.resetPassword,
    },
  }
})

const realUser = {
  id: 'user-1',
  name: 'Test Student',
  email: 'student@example.com',
}

function renderApp(initialPath = '/login') {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <AuthProvider>
        <App />
      </AuthProvider>
    </MemoryRouter>,
  )
}

async function submitAuth(
  email = realUser.email,
  password = 'secure-password',
) {
  const user = userEvent.setup()
  await user.type(screen.getByLabelText('Email'), email)
  await user.type(screen.getByLabelText('Password'), password)
  await user.click(screen.getByRole('button', { name: 'Sign in' }))
}

describe('Better Auth integration', () => {
  beforeEach(() => {
    authMocks.getSession.mockReset()
    authMocks.signInEmail.mockReset()
    authMocks.signUpEmail.mockReset()
    authMocks.signOut.mockReset()
    authMocks.requestPasswordReset.mockReset()
    authMocks.resetPassword.mockReset()
    authMocks.getSession.mockResolvedValue({ data: null, error: null })
  })

  it('shows an unauthenticated login page', async () => {
    renderApp()

    expect(await screen.findByRole('heading', { name: 'Sign in' })).toBeInTheDocument()
  })

  it('logs in with Better Auth and navigates home', async () => {
    authMocks.signInEmail.mockResolvedValue({ data: {}, error: null })
    authMocks.getSession
    .mockResolvedValueOnce({
      data: null,
      error: null,
    })
    .mockResolvedValue({
      data: { user: realUser, session: {} },
      error: null,
    })

    renderApp()
    await submitAuth()

    await waitFor(() => {
      expect(authMocks.signInEmail).toHaveBeenCalledWith({
        email: realUser.email,
        password: 'secure-password',
      })
      expect(
        screen.getByRole('heading', {
          name: 'Complete your BeaverLink profile',
        }),
      ).toBeInTheDocument()
    })
  })

  it('allows existing accounts with short passwords to log in', async () => {
    authMocks.signInEmail.mockResolvedValue({ data: {}, error: null })
    authMocks.getSession
      .mockResolvedValueOnce({ data: null, error: null })
      .mockResolvedValue({
        data: { user: realUser, session: {} },
        error: null,
      })

    renderApp()
    await submitAuth(realUser.email, 'oldpass123')

    await waitFor(() => {
      expect(authMocks.signInEmail).toHaveBeenCalledWith({
        email: realUser.email,
        password: 'oldpass123',
      })
    })
  })

  it('links login users to the forgot-password page', async () => {
    const user = userEvent.setup()
    renderApp()

    await user.click(
      await screen.findByRole('button', { name: 'Forgot password?' }),
    )

    expect(
      await screen.findByRole('heading', { name: 'Forgot password?' }),
    ).toBeInTheDocument()
  })

  it('creates an account with Better Auth', async () => {
    authMocks.signUpEmail.mockResolvedValue({ data: {}, error: null })
    authMocks.getSession
      .mockResolvedValueOnce({ data: null, error: null })
      .mockResolvedValue({
        data: { user: realUser, session: {} },
        error: null,
      })

    renderApp()
    await userEvent.click(
      await screen.findByRole('button', { name: 'Create account' }),
    )

    await userEvent.type(screen.getByLabelText('Name'), 'Test Student')
    await userEvent.type(screen.getByLabelText('Email'), realUser.email)
    await userEvent.type(
      screen.getByLabelText('Password'),
      'secure-password',
    )
    await userEvent.type(
      screen.getByLabelText('Confirm password'),
      'secure-password',
    )
    await userEvent.click(
      screen.getByRole('button', { name: 'Create account' }),
    )

    await waitFor(() => {
      expect(authMocks.signUpEmail).toHaveBeenCalledWith({
        name: 'Test Student',
        email: realUser.email,
        password: 'secure-password',
      })
    })
  })

  it('rejects a signup password shorter than 12 characters', async () => {
    renderApp()
    await userEvent.click(
      await screen.findByRole('button', { name: 'Create account' }),
    )

    await userEvent.type(screen.getByLabelText('Name'), 'Test Student')
    await userEvent.type(screen.getByLabelText('Email'), realUser.email)
    await userEvent.type(screen.getByLabelText('Password'), 'short')
    await userEvent.type(screen.getByLabelText('Confirm password'), 'short')
    await userEvent.click(
      screen.getByRole('button', { name: 'Create account' }),
    )

    expect(
      await screen.findByText('Password must be at least 12 characters.'),
    ).toBeInTheDocument()
    expect(authMocks.signUpEmail).not.toHaveBeenCalled()
  })

  it('rejects a signup password longer than 128 characters', async () => {
    renderApp()
    await userEvent.click(
      await screen.findByRole('button', { name: 'Create account' }),
    )

    const longPassword = 'a'.repeat(129)
    await userEvent.type(screen.getByLabelText('Name'), 'Test Student')
    await userEvent.type(screen.getByLabelText('Email'), realUser.email)
    await userEvent.type(screen.getByLabelText('Password'), longPassword)
    await userEvent.type(
      screen.getByLabelText('Confirm password'),
      longPassword,
    )
    await userEvent.click(
      screen.getByRole('button', { name: 'Create account' }),
    )

    expect(
      await screen.findByText('Password must be 128 characters or fewer.'),
    ).toBeInTheDocument()
    expect(authMocks.signUpEmail).not.toHaveBeenCalled()
  })

  it('rejects mismatched signup passwords', async () => {
    renderApp()
    await userEvent.click(
      await screen.findByRole('button', { name: 'Create account' }),
    )

    await userEvent.type(screen.getByLabelText('Name'), 'Test Student')
    await userEvent.type(screen.getByLabelText('Email'), realUser.email)
    await userEvent.type(
      screen.getByLabelText('Password'),
      'matching-length',
    )
    await userEvent.type(
      screen.getByLabelText('Confirm password'),
      'different-length',
    )
    await userEvent.click(
      screen.getByRole('button', { name: 'Create account' }),
    )

    expect(
      await screen.findByText('Passwords do not match.'),
    ).toBeInTheDocument()
    expect(authMocks.signUpEmail).not.toHaveBeenCalled()
  })

  it('provides show and hide password controls', async () => {
    const user = userEvent.setup()
    renderApp()
    await user.click(
      await screen.findByRole('button', { name: 'Create account' }),
    )

    const password = screen.getByLabelText('Password')
    expect(password).toHaveAttribute('type', 'password')
    await user.click(screen.getByRole('button', { name: 'Show password' }))
    expect(password).toHaveAttribute('type', 'text')
    await user.click(screen.getByRole('button', { name: 'Hide password' }))
    expect(password).toHaveAttribute('type', 'password')
  })

  it('provides show and hide controls on login', async () => {
    const user = userEvent.setup()
    renderApp()

    const password = await screen.findByLabelText('Password')
    expect(password).toHaveAttribute('type', 'password')
    await user.click(screen.getByRole('button', { name: 'Show password' }))
    expect(password).toHaveAttribute('type', 'text')
  })

  it('shows signup server errors', async () => {
    authMocks.signUpEmail.mockResolvedValue({
      data: null,
      error: { message: 'Email already exists' },
    })

    renderApp()
    await userEvent.click(
      await screen.findByRole('button', { name: 'Create account' }),
    )
    await userEvent.type(screen.getByLabelText('Name'), 'Test Student')
    await userEvent.type(screen.getByLabelText('Email'), realUser.email)
    await userEvent.type(
      screen.getByLabelText('Password'),
      'secure-password',
    )
    await userEvent.type(
      screen.getByLabelText('Confirm password'),
      'secure-password',
    )
    await userEvent.click(
      screen.getByRole('button', { name: 'Create account' }),
    )

    expect(
      await screen.findByRole('alert'),
    ).toHaveTextContent('Email already exists')
  })

  it('shows invalid credential errors', async () => {
    authMocks.signInEmail.mockResolvedValue({
      data: null,
      error: { message: 'Invalid email or password' },
    })

    renderApp()
    await submitAuth()

    expect(
      await screen.findByRole('alert'),
    ).toHaveTextContent('Invalid email or password')
  })

  it('restores an existing session after refresh', async () => {
    authMocks.getSession.mockResolvedValue({
      data: { user: realUser, session: {} },
      error: null,
    })

    renderApp('/home')

    expect(
      await screen.findByRole('heading', {
        name: 'Complete your BeaverLink profile',
      }),
    ).toBeInTheDocument()
  })

  it('does not assign an application role to a real authenticated identity', async () => {
    authMocks.getSession.mockResolvedValue({
      data: { user: realUser, session: {} },
      error: null,
    })

    renderApp('/home')

    expect(
      await screen.findByRole('heading', {
        name: 'Complete your BeaverLink profile',
      }),
    ).toBeInTheDocument()
  })

  it('redirects unauthenticated home visits to login', async () => {
    renderApp('/home')

    expect(
      await screen.findByRole('heading', { name: 'Sign in' }),
    ).toBeInTheDocument()
  })

  it('logs out and invalidates the UI session', async () => {
    authMocks.getSession
      .mockResolvedValueOnce({
        data: { user: realUser, session: {} },
        error: null,
      })
      .mockResolvedValue({ data: null, error: null })
    authMocks.signOut.mockResolvedValue({ data: {}, error: null })

    renderApp('/home')
    await userEvent.click(
      await screen.findByRole('button', { name: 'Log out' }),
    )

    expect(await screen.findByRole('heading', { name: 'Sign in' })).toBeInTheDocument()
  })

  it('shows loading while restoring a session', async () => {
    authMocks.getSession.mockImplementation(
      () =>
        new Promise((resolve) => {
          setTimeout(() => resolve({ data: null, error: null }), 50)
        }),
    )

    renderApp('/home')

    expect(screen.getByRole('status')).toHaveTextContent(
      'Loading your session',
    )
  })

  it('requests a password reset with the generic success response', async () => {
    authMocks.requestPasswordReset.mockResolvedValue({
      data: { status: true },
      error: null,
    })
    renderApp('/forgot-password')

    await userEvent.type(
      await screen.findByLabelText('Email'),
      realUser.email,
    )
    await userEvent.click(
      screen.getByRole('button', { name: 'Send reset link' }),
    )

    expect(authMocks.requestPasswordReset).toHaveBeenCalled()
    expect(await screen.findByRole('status')).toHaveTextContent(
      'If this email is associated with an account',
    )
  })

  it('shows a loading state while requesting a password reset', async () => {
    authMocks.requestPasswordReset.mockImplementation(
      () =>
        new Promise((resolve) => {
          setTimeout(() => resolve({ data: { status: true }, error: null }), 50)
        }),
    )
    renderApp('/forgot-password')

    await userEvent.type(
      await screen.findByLabelText('Email'),
      realUser.email,
    )
    await userEvent.click(
      screen.getByRole('button', { name: 'Send reset link' }),
    )

    expect(
      screen.getByRole('button', { name: 'Sending…' }),
    ).toBeDisabled()
  })

  it('shows an error when the password-reset request fails', async () => {
    authMocks.requestPasswordReset.mockResolvedValue({
      data: null,
      error: { message: 'Service unavailable' },
    })
    renderApp('/forgot-password')

    await userEvent.type(
      await screen.findByLabelText('Email'),
      realUser.email,
    )
    await userEvent.click(
      screen.getByRole('button', { name: 'Send reset link' }),
    )

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Unable to request a password reset',
    )
  })

  it('rejects mismatched reset passwords', async () => {
    renderApp('/reset-password?token=valid-test-token')

    await userEvent.type(
      await screen.findByLabelText('New password'),
      'matching-length',
    )
    await userEvent.type(
      screen.getByLabelText('Confirm password'),
      'different-length',
    )
    await userEvent.click(
      screen.getByRole('button', { name: 'Reset password' }),
    )

    expect(
      await screen.findByText('Passwords do not match.'),
    ).toBeInTheDocument()
    expect(authMocks.resetPassword).not.toHaveBeenCalled()
  })

  it('rejects reset passwords shorter than 12 characters', async () => {
    renderApp('/reset-password?token=valid-test-token')

    await userEvent.type(
      await screen.findByLabelText('New password'),
      'short',
    )
    await userEvent.type(screen.getByLabelText('Confirm password'), 'short')
    await userEvent.click(
      screen.getByRole('button', { name: 'Reset password' }),
    )

    expect(
      await screen.findByText('Password must be at least 12 characters.'),
    ).toBeInTheDocument()
  })

  it('rejects reset passwords longer than 128 characters', async () => {
    renderApp('/reset-password?token=valid-test-token')
    const longPassword = 'a'.repeat(129)

    await userEvent.type(
      await screen.findByLabelText('New password'),
      longPassword,
    )
    await userEvent.type(
      screen.getByLabelText('Confirm password'),
      longPassword,
    )
    await userEvent.click(
      screen.getByRole('button', { name: 'Reset password' }),
    )

    expect(
      await screen.findByText('Password must be 128 characters or fewer.'),
    ).toBeInTheDocument()
  })

  it('shows invalid and missing reset tokens as unusable', async () => {
    renderApp('/reset-password')

    expect(
      await screen.findByRole('alert'),
    ).toHaveTextContent('invalid or has expired')
  })

  it('resets a password and redirects to login', async () => {
    authMocks.resetPassword.mockResolvedValue({
      data: { status: true },
      error: null,
    })
    renderApp('/reset-password?token=valid-test-token')

    await userEvent.type(
      await screen.findByLabelText('New password'),
      'secure-password',
    )
    await userEvent.type(
      screen.getByLabelText('Confirm password'),
      'secure-password',
    )
    await userEvent.click(
      screen.getByRole('button', { name: 'Reset password' }),
    )

    await waitFor(() => {
      expect(authMocks.resetPassword).toHaveBeenCalledWith({
        newPassword: 'secure-password',
        token: 'valid-test-token',
      })
      expect(screen.getByRole('heading', { name: 'Sign in' })).toBeInTheDocument()
    })
  })

  it('shows invalid or used reset tokens as unusable', async () => {
    authMocks.resetPassword.mockResolvedValue({
      data: null,
      error: { message: 'INVALID_TOKEN' },
    })
    renderApp('/reset-password?token=used-test-token')

    await userEvent.type(
      await screen.findByLabelText('New password'),
      'secure-password',
    )
    await userEvent.type(
      screen.getByLabelText('Confirm password'),
      'secure-password',
    )
    await userEvent.click(
      screen.getByRole('button', { name: 'Reset password' }),
    )

    expect(
      await screen.findByRole('alert'),
    ).toHaveTextContent('invalid, expired, or has already been used')
  })
})
