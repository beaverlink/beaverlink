import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { authClient } from '../auth/authClient'
import { Button } from '../components/Button'
import { Input } from '../components/Input'
import { Logo } from '../components/Logo'

const MIN_PASSWORD_LENGTH = 12
const MAX_PASSWORD_LENGTH = 128

export function ResetPasswordPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const token = searchParams.get('token')

  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordError, setPasswordError] = useState('')
  const [confirmPasswordError, setConfirmPasswordError] = useState('')
  const [formError, setFormError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setPasswordError('')
    setConfirmPasswordError('')
    setFormError('')

    if (!password) {
      setPasswordError('Password is required.')
      return
    }
    if (password.length < MIN_PASSWORD_LENGTH) {
      setPasswordError('Password must be at least 12 characters.')
      return
    }
    if (password.length > MAX_PASSWORD_LENGTH) {
      setPasswordError('Password must be 128 characters or fewer.')
      return
    }
    if (!confirmPassword) {
      setConfirmPasswordError('Confirm your password.')
      return
    }
    if (password !== confirmPassword) {
      setConfirmPasswordError('Passwords do not match.')
      return
    }
    if (!token) {
      setFormError('This password reset link is invalid or has expired.')
      return
    }

    setIsLoading(true)
    try {
      const { error } = await authClient.resetPassword({
        newPassword: password,
        token,
      })
      if (error) {
        setFormError(
          'This password reset link is invalid, expired, or has already been used.',
        )
        return
      }
      navigate('/login', { replace: true, state: { passwordReset: true } })
    } catch {
      setFormError('This password reset link is invalid or has expired.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-paper px-6 py-12">
      <section className="w-full max-w-sm rounded-2xl border border-stone-200 bg-white p-8 shadow-sm">
        <Logo />
        <header className="mt-8">
          <h1 className="text-2xl font-bold tracking-tight text-ink">
            Reset password
          </h1>
          <p className="mt-1.5 text-sm text-stone-500">
            Choose a new password for your BeaverLink account.
          </p>
        </header>

        {!token ? (
          <div className="mt-7">
            <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700 ring-1 ring-inset ring-red-600/15">
              This password reset link is invalid or has expired.
            </p>
            <Link
              to="/forgot-password"
              className="mt-6 block text-center text-sm font-semibold text-osu underline-offset-2 hover:underline"
            >
              Request a new link
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} noValidate className="mt-7 flex flex-col gap-4">
            <Input
              label="New password"
              type="password"
              name="password"
              autoComplete="new-password"
              placeholder="At least 12 characters"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              error={passwordError}
            />
            <Input
              label="Confirm password"
              type="password"
              name="confirm-password"
              autoComplete="new-password"
              placeholder="Re-enter your password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              error={confirmPasswordError}
            />
            {formError && (
              <p role="alert" className="rounded-xl bg-red-50 px-3.5 py-2.5 text-sm text-red-700 ring-1 ring-inset ring-red-600/15">
                {formError}
              </p>
            )}
            <Button type="submit" disabled={isLoading} className="w-full">
              {isLoading ? 'Resetting…' : 'Reset password'}
            </Button>
          </form>
        )}
      </section>
    </main>
  )
}
