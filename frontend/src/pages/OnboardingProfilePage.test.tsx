import { describe, expect, it, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from '../auth/AuthProvider'
import { OnboardingProfilePage } from './OnboardingProfilePage'

function seed(hasProfile: boolean) {
  localStorage.setItem('beaverlink.demo.user', JSON.stringify({ id: 'u-1', name: 'Pat', email: 'p@x.edu', role: 'student', hasProfile }))
  localStorage.setItem('beaverlink.demo.accounts', JSON.stringify([{ email: 'p@x.edu', password: 'secret12', user: { id: 'u-1', name: 'Pat', email: 'p@x.edu', role: 'student', hasProfile } }]))
}

function renderOnboarding() {
  return render(
    <MemoryRouter initialEntries={['/onboarding/profile']}>
      <AuthProvider>
        <Routes>
          <Route path="/onboarding/profile" element={<OnboardingProfilePage />} />
          <Route path="/home" element={<p>home</p>} />
        </Routes>
      </AuthProvider>
    </MemoryRouter>,
  )
}

describe('OnboardingProfilePage', () => {
  beforeEach(() => localStorage.clear())

  it('saves a student profile and lands on home', async () => {
    seed(false)
    const u = userEvent.setup()
    renderOnboarding()
    await u.type(screen.getByLabelText('Major'), 'Computer Science')
    await u.type(screen.getByLabelText('Location'), 'Corvallis, OR')
    await u.click(screen.getByRole('checkbox', { name: 'Find a mentor' }))
    await u.click(screen.getByRole('button', { name: 'Continue to BeaverLink' }))
    expect(await screen.findByText('home')).toBeInTheDocument()
  })

  it('redirects to home if the profile is already done', () => {
    seed(true)
    renderOnboarding()
    expect(screen.getByText('home')).toBeInTheDocument()
  })
})
