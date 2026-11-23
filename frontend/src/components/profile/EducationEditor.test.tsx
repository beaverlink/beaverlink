import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { EducationEditor } from './EducationEditor'

describe('EducationEditor', () => {
  it('starts empty and adds an entry', async () => {
    const onChange = vi.fn()
    const u = userEvent.setup()
    render(<EducationEditor value={[]} onChange={onChange} />)

    expect(screen.getByText('No education added yet.')).toBeInTheDocument()
    await u.click(screen.getByRole('button', { name: '+ Add education' }))

    await u.type(screen.getByLabelText('School'), 'Oregon State University')
    await u.type(screen.getByLabelText('Degree'), 'B.S.')
    await u.type(screen.getByLabelText('Field of study'), 'Computer Science')
    await u.type(screen.getByLabelText('Start year'), '2023')
    await u.click(screen.getByRole('button', { name: 'Save education' }))

    expect(onChange).toHaveBeenCalledWith([
      expect.objectContaining({ school: 'Oregon State University', degree: 'B.S.', fieldOfStudy: 'Computer Science', startYear: '2023' }),
    ])
  })
})
