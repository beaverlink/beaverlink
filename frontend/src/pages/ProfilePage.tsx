import { useState } from 'react'
import { AppShell } from '../components/shared/AppShell'
import { ProfileForm } from '../components/profile/ProfileForm'
import { useAuth } from '../auth/useAuth'
import type { Profile, SignupRole } from '../auth/types'

const PROFILES_KEY = 'beaverlink.demo.profiles'

function readProfile(id: string): Profile | undefined {
  try {
    const all = JSON.parse(localStorage.getItem(PROFILES_KEY) ?? '{}') as Record<string, Profile>
    return all[id]
  } catch {
    return undefined
  }
}

function formRole(role: string): SignupRole {
  return role === 'alumnus' || role === 'guest' ? role : 'student'
}

function ProfilePage() {
  const { user, saveProfile } = useAuth()
  const [saved, setSaved] = useState(false)
  if (!user) return null

  const initial = readProfile(user.id)

  function handleSubmit(profile: Profile) {
    saveProfile(profile)
    setSaved(true)
  }

  return (
    <AppShell>
      <div className="mx-auto max-w-3xl">
        <h1 className="text-2xl font-bold tracking-tight text-ink">Your profile</h1>
        <ProfileForm
          role={formRole(user.role)}
          userName={user.name}
          initial={initial}
          submitLabel="Save profile"
          onSubmit={handleSubmit}
        />
        {saved && <p role="status" className="mt-4 text-sm text-stone-600">Profile saved.</p>}
      </div>
    </AppShell>
  )
}

export default ProfilePage
