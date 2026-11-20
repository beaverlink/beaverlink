import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ProfileForm } from './ProfileForm'

describe('ProfileForm', () => {
  it('shows guest-specific fields and submits a profile', async () => {
    const onSubmit = vi.fn()
    const u = userEvent.setup()
    render(<ProfileForm role="guest" userName="Riley Guest" submitLabel="Continue" onSubmit={onSubmit} />)

    // Guest fields present; student-only field absent.
    expect(screen.getByLabelText('Company / organization')).toBeInTheDocument()
    expect(screen.queryByLabelText('Year')).toBeNull()

    await u.type(screen.getByLabelText('Company / organization'), 'Rivian')
    await u.type(screen.getByLabelText('Position / title'), 'Recruiter')
    await u.type(screen.getByLabelText('Location'), 'Seattle, WA')
    await u.click(screen.getByRole('checkbox', { name: 'Grow my network' }))
    await u.click(screen.getByRole('button', { name: 'Continue' }))

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ company: 'Rivian', position: 'Recruiter', location: 'Seattle, WA', source: 'manual' }),
    )
  })

  it('requires at least one goal', async () => {
    const onSubmit = vi.fn()
    const u = userEvent.setup()
    render(<ProfileForm role="student" userName="Pat Student" submitLabel="Continue" onSubmit={onSubmit} />)
    await u.type(screen.getByLabelText('Major'), 'Computer Science')
    await u.type(screen.getByLabelText('Location'), 'Corvallis, OR')
    await u.click(screen.getByRole('button', { name: 'Continue' }))
    expect(screen.getByText('Choose at least one goal.')).toBeInTheDocument()
    expect(onSubmit).not.toHaveBeenCalled()
  })
})
