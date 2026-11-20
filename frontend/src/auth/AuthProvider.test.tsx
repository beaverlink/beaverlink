import { describe, expect, it, beforeEach } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import { useAuth } from './useAuth'
import { AuthProvider } from './AuthProvider'
import type { AuthContextValue } from './types'

// Grab the live context value so we can drive signup/saveProfile directly.
let ctx: AuthContextValue
function Probe() {
  ctx = useAuth()
  return <span data-testid="state">{ctx.user ? `${ctx.user.email}:${ctx.user.hasProfile}` : 'anon'}</span>
}
function setup() {
  render(<AuthProvider><Probe /></AuthProvider>)
}

describe('AuthProvider signup + profile', () => {
  beforeEach(() => localStorage.clear())

  it('signs up a new user with no profile yet', async () => {
    setup()
    await act(async () => {
      await ctx.signup({ email: 'new@oregonstate.edu', password: 'secret12', name: 'Pat Doe', role: 'guest' })
    })
    expect(screen.getByTestId('state')).toHaveTextContent('new@oregonstate.edu:false')
  })

  it('rejects a duplicate email', async () => {
    setup()
    await act(async () => {
      await ctx.signup({ email: 'dup@oregonstate.edu', password: 'secret12', name: 'A', role: 'student' })
    })
    await expect(
      ctx.signup({ email: 'dup@oregonstate.edu', password: 'other123', name: 'B', role: 'student' }),
    ).rejects.toThrow('already exists')
  })

  it('saveProfile flips hasProfile to true', async () => {
    setup()
    await act(async () => {
      await ctx.signup({ email: 'p@oregonstate.edu', password: 'secret12', name: 'Pat', role: 'student' })
    })
    act(() => {
      ctx.saveProfile({ location: 'Corvallis, OR', goals: ['Find a mentor'], studentYear: 'Third year', major: 'CS', experience: [], education: [], source: 'manual' })
    })
    expect(screen.getByTestId('state')).toHaveTextContent('p@oregonstate.edu:true')
  })

  it('logs in a demo account with a profile already present', async () => {
    setup()
    await act(async () => { await ctx.login('student@oregonstate.edu', 'demo1234') })
    expect(screen.getByTestId('state')).toHaveTextContent('student@oregonstate.edu:true')
  })
})
