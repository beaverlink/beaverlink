import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { authClient } from '../auth/authClient'
import { Button } from '../components/Button'
import { Input } from '../components/Input'
import { Logo } from '../components/Logo'

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [emailError, setEmailError] = useState('')
  const [formError, setFormError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setEmailError('')
    setFormError('')

    if (!email.trim()) {
      setEmailError('Email is required.')
      return
    }
    if (!EMAIL_PATTERN.test(email.trim())) {
      setEmailError('Enter a valid email address.')
      return
    }

    setIsLoading(true)
    try {
      const { error } = await authClient.requestPasswordReset({
        email: email.trim(),
        redirectTo: `${window.location.origin}/reset-password`,
      })
      if (error) {
        setFormError('Unable to request a password reset. Please try again.')
        return
      }
      setSubmitted(true)
    } catch {
      setFormError('Unable to request a password reset. Please try again.')
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
            Forgot password?
          </h1>
          <p className="mt-1.5 text-sm text-stone-500">
            Enter your email and we will send reset instructions if an account exists.
          </p>
        </header>

        {submitted ? (
          <div className="mt-7">
            <p role="status" className="rounded-xl bg-green-50 px-4 py-3 text-sm text-green-800 ring-1 ring-inset ring-green-600/15">
              If this email is associated with an account, check it for password reset instructions.
            </p>
            <Link
              to="/login"
              className="mt-6 block text-center text-sm font-semibold text-osu underline-offset-2 hover:underline"
            >
              Back to sign in
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} noValidate className="mt-7 flex flex-col gap-4">
            <Input
              label="Email"
              type="email"
              name="email"
              autoComplete="username"
              placeholder="you@oregonstate.edu"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              error={emailError}
            />
            {formError && (
              <p role="alert" className="text-sm text-red-600">
                {formError}
              </p>
            )}
            <Button type="submit" disabled={isLoading} className="w-full">
              {isLoading ? 'Sending…' : 'Send reset link'}
            </Button>
            <Link
              to="/login"
              className="text-center text-sm font-semibold text-osu underline-offset-2 hover:underline"
            >
              Back to sign in
            </Link>
          </form>
        )}
      </section>
    </main>
  )
}
