import { useState } from 'react'
import type { FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '../components/Button'
import { Input } from '../components/Input'
import { Logo } from '../components/Logo'
import { useAuth } from '../auth/useAuth'
import osuCampus from '../assets/osu-campus.png'

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function LoginPage() {
  const { login, signup, isLoading } = useAuth()
  const navigate = useNavigate()

  const [mode, setMode] = useState<'signin' | 'signup'>('signin')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [nameError, setNameError] = useState('')
  const [emailError, setEmailError] = useState('')
  const [passwordError, setPasswordError] = useState('')
  const [formError, setFormError] = useState('')

  function validate(): boolean {
    let ok = true
    if (mode === 'signup' && !name.trim()) {
      setNameError('Name is required.')
      ok = false
    } else {
      setNameError('')
    }

    if (!email.trim()) {
      setEmailError('Email is required.')
      ok = false
    } else if (!EMAIL_PATTERN.test(email.trim())) {
      setEmailError('Enter a valid email address.')
      ok = false
    } else {
      setEmailError('')
    }

    if (!password) {
      setPasswordError('Password is required.')
      ok = false
    } else {
      setPasswordError('')
    }
    return ok
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setFormError('')
    if (!validate()) return

    try {
      if (mode === 'signup') {
        await signup(name, email, password)
      } else {
        await login(email, password)
      }
      navigate('/home', { replace: true })
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Unable to sign in.')
    }
  }

  return (
    <main className="flex min-h-screen flex-row-reverse bg-paper">
      {/* Campus hero — right 2/3 on large screens, hidden on mobile. */}
      <aside className="relative hidden w-2/3 overflow-hidden lg:block">
        <img
          src={osuCampus}
          alt="Oregon State University campus entrance with spring tulips"
          className="h-full w-full object-cover"
        />
        {/* Scrim for legibility: dark base plus a warm Beaver-Orange wash. */}
        <div className="absolute inset-0 bg-gradient-to-t from-ink/80 via-ink/25 to-ink/5" />
        <div className="absolute inset-0 bg-gradient-to-tr from-osu/35 via-transparent to-transparent mix-blend-multiply" />

        <div className="absolute inset-0 flex flex-col justify-end p-10 xl:p-14">
          <div className="max-w-xl">
            <h2 className="text-4xl font-bold leading-[1.05] tracking-tight text-white xl:text-5xl">
              Meet the people worth
              <br />
              meeting — before the
              <br />
              room fills up.
            </h2>
            <p className="mt-4 max-w-md text-base leading-relaxed text-white/80">
              BeaverLink recommends who OSU students and alumni should connect
              with at every networking event, and why.
            </p>
          </div>
        </div>
      </aside>

      {/* Sign-in panel — left 1/3 on large screens, full width on mobile. */}
      <section className="flex w-full flex-col justify-center px-6 py-12 sm:px-10 lg:w-1/3 xl:px-14">
        <div className="mx-auto w-full max-w-sm">
          <div className="text-ink">
            <Logo />
          </div>

          <header className="mt-8">
            <h1 className="text-2xl font-bold tracking-tight text-ink">
              {mode === 'signup' ? 'Create an account' : 'Sign in'}
            </h1>
            <p className="mt-1.5 text-sm text-stone-500">
              {mode === 'signup'
                ? 'Create your BeaverLink account to continue.'
                : 'Welcome back. Enter your credentials to continue.'}
            </p>
          </header>

          <form onSubmit={handleSubmit} noValidate className="mt-7 flex flex-col gap-4">
            {mode === 'signup' && (
              <Input
                label="Name"
                type="text"
                name="name"
                placeholder="Your name"
                autoComplete="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                error={nameError}
              />
            )}
            <Input
              label="Email"
              type="email"
              name="email"
              placeholder="you@oregonstate.edu"
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              error={emailError}
            />
            <Input
              label="Password"
              type="password"
              name="password"
              placeholder="••••••••"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              error={passwordError}
            />

            {formError && (
              <p
                role="alert"
                className="flex items-start gap-2 rounded-xl bg-red-50 px-3.5 py-2.5 text-sm text-red-700 ring-1 ring-inset ring-red-600/15"
              >
                <svg
                  viewBox="0 0 20 20"
                  className="mt-0.5 h-4 w-4 shrink-0"
                  fill="currentColor"
                  aria-hidden="true"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zM9 9a1 1 0 112 0v4a1 1 0 11-2 0V9zm1-4a1 1 0 100 2 1 1 0 000-2z"
                    clipRule="evenodd"
                  />
                </svg>
                {formError}
              </p>
            )}

            <Button type="submit" disabled={isLoading} className="mt-1 w-full">
              {isLoading
                ? mode === 'signup'
                  ? 'Creating account…'
                  : 'Signing in…'
                : mode === 'signup'
                  ? 'Create account'
                  : 'Sign in'}
            </Button>
          </form>

          <p className="mt-8 text-center text-sm text-stone-500">
            {mode === 'signup' ? 'Already have an account?' : 'New to BeaverLink?'}{' '}
            <button
              type="button"
              className="font-semibold text-osu underline-offset-2 hover:underline"
              onClick={() => {
                setMode(mode === 'signup' ? 'signin' : 'signup')
                setNameError('')
                setEmailError('')
                setPasswordError('')
                setFormError('')
              }}
            >
              {mode === 'signup' ? 'Sign in' : 'Create account'}
            </button>
          </p>
        </div>
      </section>
    </main>
  )
}
