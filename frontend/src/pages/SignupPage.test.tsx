import { describe, expect, it, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from '../auth/AuthProvider'
import { SignupPage } from './SignupPage'

function renderSignup() {
  return render(
    <MemoryRouter initialEntries={['/signup']}>
      <AuthProvider>
        <Routes>
          <Route path="/signup" element={<SignupPage />} />
          <Route path="/home" element={<p>home</p>} />
          <Route path="/onboarding/profile" element={<p>onboarding</p>} />
        </Routes>
      </AuthProvider>
    </MemoryRouter>,
  )
}

describe('SignupPage', () => {
  beforeEach(() => localStorage.clear())

  it('walks through all three steps and lands on onboarding', async () => {
    const u = userEvent.setup()
    renderSignup()

    await u.type(screen.getByLabelText('Email'), 'new@oregonstate.edu')
    await u.click(screen.getByRole('button', { name: 'Next' }))

    await u.type(screen.getByLabelText('Password'), 'Secret12!')
    await u.type(screen.getByLabelText('Confirm password'), 'Secret12!')
    await u.click(screen.getByRole('button', { name: 'Next' }))

    await u.type(screen.getByLabelText('Full name'), 'Pat Doe')
    await u.click(screen.getByRole('button', { name: 'Guest' }))
    await u.click(screen.getByRole('button', { name: 'Create account' }))

    expect(await screen.findByText('onboarding')).toBeInTheDocument()
  })

  it('blocks a mismatched password confirmation', async () => {
    const u = userEvent.setup()
    renderSignup()
    await u.type(screen.getByLabelText('Email'), 'new@oregonstate.edu')
    await u.click(screen.getByRole('button', { name: 'Next' }))
    await u.type(screen.getByLabelText('Password'), 'Secret12!')
    await u.type(screen.getByLabelText('Confirm password'), 'Secret12?')
    await u.click(screen.getByRole('button', { name: 'Next' }))
    expect(screen.getByText('Passwords do not match.')).toBeInTheDocument()
  })

  it('rejects a password that misses the complexity rule', async () => {
    const u = userEvent.setup()
    renderSignup()
    await u.type(screen.getByLabelText('Email'), 'new@oregonstate.edu')
    await u.click(screen.getByRole('button', { name: 'Next' }))
    await u.type(screen.getByLabelText('Password'), 'weakpass')
    await u.type(screen.getByLabelText('Confirm password'), 'weakpass')
    await u.click(screen.getByRole('button', { name: 'Next' }))
    expect(screen.getByText(/uppercase letter/i)).toBeInTheDocument()
  })
})
