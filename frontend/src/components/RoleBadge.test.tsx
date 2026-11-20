import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { RoleBadge } from './RoleBadge'

describe('RoleBadge', () => {
  it('renders a label for the guest role', () => {
    render(<RoleBadge role="guest" />)
    expect(screen.getByText('Guest')).toBeInTheDocument()
  })
})
