import { describe, expect, it, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { AuthProvider } from '../auth/AuthProvider'
import ProfilePage from './ProfilePage'

function seedStudent() {
  localStorage.setItem('beaverlink.demo.user', JSON.stringify({ id: 'u-1', name: 'Pat', email: 'p@x.edu', role: 'student', hasProfile: true }))
  localStorage.setItem('beaverlink.demo.profiles', JSON.stringify({ 'u-1': { location: 'Corvallis, OR', goals: ['Find a mentor'], studentYear: 'Third year', major: 'CS', source: 'manual' } }))
}

describe('ProfilePage (edit)', () => {
  beforeEach(() => localStorage.clear())

  it('pre-fills the saved profile and saves edits', async () => {
    seedStudent()
    const u = userEvent.setup()
    render(<MemoryRouter><AuthProvider><ProfilePage /></AuthProvider></MemoryRouter>)
    expect(screen.getByLabelText('Location')).toHaveValue('Corvallis, OR')
    await u.clear(screen.getByLabelText('Location'))
    await u.type(screen.getByLabelText('Location'), 'Portland, OR')
    await u.click(screen.getByRole('button', { name: 'Save profile' }))
    expect(await screen.findByText('Profile saved.')).toBeInTheDocument()
  })
})
