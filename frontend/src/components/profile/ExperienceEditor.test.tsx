import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ExperienceEditor } from './ExperienceEditor'

describe('ExperienceEditor', () => {
  it('starts empty and adds an entry', async () => {
    const onChange = vi.fn()
    const u = userEvent.setup()
    render(<ExperienceEditor value={[]} onChange={onChange} />)

    expect(screen.getByText('No experience added yet.')).toBeInTheDocument()
    await u.click(screen.getByRole('button', { name: '+ Add experience' }))

    await u.type(screen.getByLabelText('Title'), 'Software Engineering Intern')
    await u.type(screen.getByLabelText('Company'), 'Rivian')
    await u.type(screen.getByLabelText('Start date'), 'Jun 2025')
    await u.click(screen.getByRole('checkbox', { name: 'I currently work here' }))
    await u.click(screen.getByRole('button', { name: 'Save experience' }))

    expect(onChange).toHaveBeenCalledWith([
      expect.objectContaining({ title: 'Software Engineering Intern', company: 'Rivian', startDate: 'Jun 2025', current: true }),
    ])
  })

  it('renders an existing entry with remove support', async () => {
    const onChange = vi.fn()
    const u = userEvent.setup()
    const entry = { id: '1', title: 'PM', company: 'Nike', startDate: 'Jan 2020', endDate: 'Dec 2022', current: false }
    render(<ExperienceEditor value={[entry]} onChange={onChange} />)

    expect(screen.getByText('PM · Nike')).toBeInTheDocument()
    await u.click(screen.getByRole('button', { name: 'Remove PM at Nike' }))
    expect(onChange).toHaveBeenCalledWith([])
  })
})
