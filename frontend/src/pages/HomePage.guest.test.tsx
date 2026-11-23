import { describe, expect, it, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { AuthProvider } from '../auth/AuthProvider'
import { HomePage } from './HomePage'

describe('HomePage guest', () => {
  beforeEach(() => localStorage.clear())
  it('shows the guest landing for a guest user', async () => {
    localStorage.setItem('beaverlink.demo.user', JSON.stringify({ id: 'u-9', name: 'Riley Guest', email: 'r@x.com', role: 'guest', hasProfile: true }))
    render(<MemoryRouter><AuthProvider><HomePage /></AuthProvider></MemoryRouter>)
    expect(await screen.findByText(/You're all set/i)).toBeInTheDocument()
  })
})
