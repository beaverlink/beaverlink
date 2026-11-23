import { useState } from 'react'
import type { FormEvent } from 'react'
import { useNavigate, Navigate, Link } from 'react-router-dom'
import { AuthCard } from '../components/auth/AuthCard'
import { Input } from '../components/Input'
import { Button } from '../components/Button'
import { useAuth } from '../auth/useAuth'
import { DEMO_PASSWORD, demoUsers } from '../auth/demoUsers'

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function LoginPage() {
  const { user, login, isLoading } = useAuth()
  const navigate = useNavigate()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [emailError, setEmailError] = useState('')
  const [passwordError, setPasswordError] = useState('')
  const [formError, setFormError] = useState('')

  if (user) return <Navigate to="/home" replace />

  function validate(): boolean {
    let ok = true
    if (!EMAIL_PATTERN.test(email.trim())) { setEmailError('Enter a valid email address.'); ok = false } else setEmailError('')
    if (!password) { setPasswordError('Password is required.'); ok = false } else setPasswordError('')
    return ok
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setFormError('')
    if (!validate()) return
    try {
      await login(email, password)
      navigate('/home', { replace: true })
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Unable to sign in.')
    }
  }

  function fillDemo(demoEmail: string) {
    setEmail(demoEmail)
    setPassword(DEMO_PASSWORD)
    setEmailError(''); setPasswordError(''); setFormError('')
  }

  return (
    <AuthCard title="Sign in" subtitle="Welcome back">
      <form className="mt-7 flex flex-col gap-4" noValidate onSubmit={handleSubmit}>
        <Input label="Email" type="email" autoComplete="username" placeholder="you@oregonstate.edu" value={email} onChange={(e) => setEmail(e.target.value)} error={emailError} />
        <Input label="Password" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} error={passwordError} />
        {formError && (
          <p role="alert" className="rounded-xl bg-red-50 px-3.5 py-2.5 text-sm text-red-700 ring-1 ring-inset ring-red-600/15">
            {formError}
          </p>
        )}
        <Button type="submit" disabled={isLoading} className="mt-1 w-full">
          {isLoading ? 'Signing in…' : 'Sign in'}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-stone-500">
        New to BeaverLink?{' '}
        <Link to="/signup" className="font-semibold text-osu hover:underline">Create an account</Link>
      </p>

      {import.meta.env.DEV && (
        <div className="mt-8">
          <div className="flex items-center gap-3">
            <span className="h-px flex-1 bg-stone-200" />
            <span className="text-xs font-semibold uppercase tracking-wide text-stone-400">Demo accounts</span>
            <span className="h-px flex-1 bg-stone-200" />
          </div>
          <p className="mt-3 text-center text-xs text-stone-500">
            Click an account to autofill — password{' '}
            <code className="rounded bg-stone-100 px-1.5 py-0.5 font-mono text-stone-700">{DEMO_PASSWORD}</code>
          </p>
          <ul className="mt-3 flex flex-col gap-2">
            {demoUsers.map((account) => (
              <li key={account.id}>
                <button
                  type="button"
                  onClick={() => fillDemo(account.email)}
                  className="flex w-full items-center gap-3 rounded-xl border border-stone-200 bg-white px-3 py-2.5 text-left hover:border-osu/50 hover:shadow-sm"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-ink">{account.email}</span>
                    <span className="block text-xs text-stone-500">{account.label}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </AuthCard>
  )
}
