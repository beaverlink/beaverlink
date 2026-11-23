import { AppShell } from '../../components/shared/AppShell'
import { useAuth } from '../../auth/useAuth'

// Minimal Phase-1 home for guests. A full guest dashboard is later work.
export default function GuestLanding() {
  const { user } = useAuth()
  return (
    <AppShell>
      <div className="mx-auto max-w-2xl py-6 text-center">
        <h1 className="text-2xl font-bold tracking-tight text-ink">
          You're all set, {user?.name.split(' ')[0]}
        </h1>
        <p className="mt-2 text-stone-600">
          Your guest profile is ready. Attendee matching opens here when your next event goes live.
        </p>
        <button
          type="button"
          disabled
          className="mt-6 inline-flex cursor-not-allowed items-center rounded-xl border border-stone-300 bg-white px-4 py-2.5 text-sm font-semibold text-stone-400"
        >
          Browse attendees · coming soon
        </button>
      </div>
    </AppShell>
  )
}
