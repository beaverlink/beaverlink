import type { ReactNode } from 'react'
import { Logo } from '../Logo'

interface AuthCardProps {
  title: string
  subtitle?: string
  onBack?: () => void
  children: ReactNode
  // Wide variant for the two-column onboarding form.
  wide?: boolean
}

// The light, centered card shell shared by sign-up, sign-in, and onboarding.
export function AuthCard({ title, subtitle, onBack, children, wide }: AuthCardProps) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-paper px-4 py-10">
      <div
        className={`relative w-full rounded-2xl border border-stone-200 bg-white p-8 shadow-[0_22px_54px_-22px_rgba(27,21,16,0.2)] sm:p-10 ${
          wide ? 'max-w-3xl' : 'max-w-md'
        }`}
      >
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            aria-label="Back"
            className="absolute left-5 top-5 grid h-10 w-10 place-items-center rounded-xl text-stone-500 hover:bg-bark-tint hover:text-ink focus:outline-none focus:ring-2 focus:ring-osu/40"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
              <path d="M15 6l-6 6 6 6" />
            </svg>
          </button>
        )}
        <div className="flex justify-center text-ink">
          <Logo />
        </div>
        <h1 className="mt-7 text-center text-2xl font-semibold tracking-tight text-ink text-balance">
          {title}
        </h1>
        {subtitle && <p className="mt-2 text-center text-sm text-stone-500">{subtitle}</p>}
        {children}
      </div>
    </main>
  )
}
