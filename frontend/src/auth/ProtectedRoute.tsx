import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from './useAuth'

// Guards routes that require a signed-in user. `requireProfile` (default true)
// additionally bounces users who haven't finished onboarding to the profile
// step, so no one reaches a dashboard without a profile.
export function ProtectedRoute({
  children,
  requireProfile = true,
}: {
  children: ReactNode
  requireProfile?: boolean
}) {
  const { user, isLoading } = useAuth()

  if (isLoading) return null
  if (!user) return <Navigate to="/login" replace />
  if (requireProfile && !user.hasProfile) {
    return <Navigate to="/onboarding/profile" replace />
  }
  return <>{children}</>
}
