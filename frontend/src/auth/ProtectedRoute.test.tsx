import { describe, expect, it, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './AuthProvider'
import { ProtectedRoute } from './ProtectedRoute'

function seedSession(hasProfile: boolean) {
  localStorage.setItem(
    'beaverlink.demo.user',
    JSON.stringify({ id: 'u-1', name: 'Pat', email: 'p@x.edu', role: 'guest', hasProfile }),
  )
}

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <AuthProvider>
        <Routes>
          <Route path="/home" element={<ProtectedRoute><p>home</p></ProtectedRoute>} />
          <Route path="/onboarding/profile" element={<p>onboarding</p>} />
          <Route path="/login" element={<p>login</p>} />
        </Routes>
      </AuthProvider>
    </MemoryRouter>,
  )
}

describe('ProtectedRoute', () => {
  beforeEach(() => localStorage.clear())

  it('sends a signed-out user to /login', () => {
    renderAt('/home')
    expect(screen.getByText('login')).toBeInTheDocument()
  })

  it('sends a profile-less user to onboarding', () => {
    seedSession(false)
    renderAt('/home')
    expect(screen.getByText('onboarding')).toBeInTheDocument()
  })

  it('lets a user with a profile through', () => {
    seedSession(true)
    renderAt('/home')
    expect(screen.getByText('home')).toBeInTheDocument()
  })
})
