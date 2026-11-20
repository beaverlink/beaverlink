import { useState } from 'react'
import type { FormEvent } from 'react'
import { useNavigate, Navigate, Link } from 'react-router-dom'
import { AuthCard } from '../components/auth/AuthCard'
import { StepDots } from '../components/auth/StepDots'
import { Input } from '../components/Input'
import { Button } from '../components/Button'
import { useAuth } from '../auth/useAuth'
import type { SignupRole } from '../auth/types'

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
// 8+ chars with an uppercase, lowercase, number, and special symbol.
const PASSWORD_RULE = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/

const roleOptions: { value: SignupRole; label: string; hint: string }[] = [
  { value: 'student', label: 'Student', hint: 'Current OSU' },
  { value: 'alumnus', label: 'Alum', hint: 'Graduated' },
  { value: 'guest', label: 'Guest', hint: 'Everyone else' },
]

const stepTitles = ['Create your account', 'Choose a password', 'Tell us who you are']
const stepSubs = ['Start with your email', 'Keep your account secure', 'So we match you with the right people']

export function SignupPage() {
  const { user, signup, isLoading } = useAuth()
  const navigate = useNavigate()

  const [step, setStep] = useState(0)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [name, setName] = useState('')
  const [role, setRole] = useState<SignupRole>('student')
  const [error, setError] = useState('')
  const [formError, setFormError] = useState('')
  const [justSignedUp, setJustSignedUp] = useState(false)

  if (user && !justSignedUp) return <Navigate to="/home" replace />

  function next() {
    setError('')
    if (step === 0) {
      if (!EMAIL_PATTERN.test(email.trim())) return setError('Enter a valid email address.')
      return setStep(1)
    }
    if (step === 1) {
      if (!PASSWORD_RULE.test(password)) {
        return setError('Use 8+ characters with an uppercase letter, a lowercase letter, a number, and a symbol.')
      }
      if (password !== confirm) return setError('Passwords do not match.')
      return setStep(2)
    }
  }

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setFormError('')
    if (!name.trim()) return setError('Enter your name.')
    try {
      await signup({ email, password, name, role })
      setJustSignedUp(true)
      navigate('/onboarding/profile', { replace: true })
    } catch (e) {
      setFormError(e instanceof Error ? e.message : 'Unable to create account.')
    }
  }

  return (
    <AuthCard
      title={stepTitles[step]}
      subtitle={stepSubs[step]}
      onBack={step > 0 ? () => { setError(''); setStep(step - 1) } : undefined}
    >
      <StepDots total={3} current={step} />

      {step < 2 ? (
        <form
          className="mt-7 flex flex-col gap-4"
          noValidate
          onSubmit={(e) => { e.preventDefault(); next() }}
        >
          {step === 0 && (
            <Input
              label="Email"
              type="email"
              autoComplete="username"
              placeholder="you@oregonstate.edu"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              error={error}
            />
          )}
          {step === 1 && (
            <>
              <Input
                label="Password"
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <Input
                label="Confirm password"
                type="password"
                autoComplete="new-password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                error={error}
              />
              <p className="text-xs text-stone-500">
                8+ characters with an uppercase, lowercase, number, and symbol.
              </p>
            </>
          )}
          <Button type="submit" className="mt-1 w-full">Next</Button>
        </form>
      ) : (
        <form className="mt-7 flex flex-col gap-4" noValidate onSubmit={handleCreate}>
          <Input
            label="Full name"
            autoComplete="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            error={error}
          />
          <div className="grid grid-cols-3 gap-2.5" role="group" aria-label="Role">
            {roleOptions.map((opt) => {
              const selected = role === opt.value
              return (
                <button
                  key={opt.value}
                  type="button"
                  aria-label={opt.label}
                  aria-pressed={selected}
                  onClick={() => setRole(opt.value)}
                  className={`rounded-xl border px-2 py-3 text-center text-sm font-semibold transition-colors ${
                    selected
                      ? 'border-osu bg-osu-tint text-osu ring-1 ring-inset ring-osu'
                      : 'border-stone-300 bg-white text-ink hover:border-osu/40'
                  }`}
                >
                  {opt.label}
                  <span className="mt-0.5 block text-[11px] font-medium text-stone-500">{opt.hint}</span>
                </button>
              )
            })}
          </div>
          {formError && (
            <p role="alert" className="rounded-xl bg-red-50 px-3.5 py-2.5 text-sm text-red-700 ring-1 ring-inset ring-red-600/15">
              {formError}
            </p>
          )}
          <Button type="submit" disabled={isLoading} className="mt-1 w-full">
            {isLoading ? 'Creating account…' : 'Create account'}
          </Button>
        </form>
      )}

      <p className="mt-6 text-center text-sm text-stone-500">
        Already have an account?{' '}
        <Link to="/login" className="font-semibold text-osu hover:underline">Sign in</Link>
      </p>
    </AuthCard>
  )
}
