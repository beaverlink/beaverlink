import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AuthCard } from './AuthCard'

describe('AuthCard', () => {
  it('renders the title and calls onBack', async () => {
    const onBack = vi.fn()
    render(<AuthCard title="Choose a password" onBack={onBack}><p>body</p></AuthCard>)
    expect(screen.getByRole('heading', { name: 'Choose a password' })).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Back' }))
    expect(onBack).toHaveBeenCalled()
  })

  it('omits the back button when no onBack is given', () => {
    render(<AuthCard title="Sign in"><p>body</p></AuthCard>)
    expect(screen.queryByRole('button', { name: 'Back' })).toBeNull()
  })
})
