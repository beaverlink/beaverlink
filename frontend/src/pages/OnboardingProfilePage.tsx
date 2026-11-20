import { Navigate, useNavigate } from 'react-router-dom'
import { AuthCard } from '../components/auth/AuthCard'
import { ProfileForm } from '../components/profile/ProfileForm'
import { useAuth } from '../auth/useAuth'
import type { Profile, SignupRole } from '../auth/types'

const roleWord: Record<SignupRole, string> = {
  student: "You're a student",
  alumnus: "You're an alum",
  guest: "You're joining as a guest",
}

// admin never onboards (provisioned), but keep the form total for type-safety.
function formRole(role: string): SignupRole {
  return role === 'alumnus' || role === 'guest' ? role : 'student'
}

export function OnboardingProfilePage() {
  const { user, saveProfile } = useAuth()
  const navigate = useNavigate()

  if (!user) return <Navigate to="/login" replace />
  if (user.hasProfile) return <Navigate to="/home" replace />

  const role = formRole(user.role)

  function handleSubmit(profile: Profile) {
    saveProfile(profile)
    navigate('/home', { replace: true })
  }

  return (
    <AuthCard title="Finish your profile" subtitle={roleWord[role]} wide>
      <ProfileForm role={role} userName={user.name} submitLabel="Continue to BeaverLink" onSubmit={handleSubmit} />
    </AuthCard>
  )
}
