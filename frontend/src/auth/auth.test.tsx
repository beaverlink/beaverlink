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
})
