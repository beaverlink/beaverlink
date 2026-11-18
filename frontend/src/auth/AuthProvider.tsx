import { useCallback, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import type { User } from './types'
import { AuthContext } from './useAuth'
import { authClient } from './authClient'

function getErrorMessage(error: unknown, fallback: string): string {
  if (
    typeof error === 'object' &&
    error !== null &&
    'message' in error &&
    typeof error.message === 'string'
  ) {
    return error.message
  }

  return fallback
}

function toUser(
  sessionUser:
    | {
        id: string
        name: string
        email: string
      }
    | null
    | undefined,
): User | null {
  if (!sessionUser) return null

  return {
    id: sessionUser.id,
    name: sessionUser.name,
    email: sessionUser.email,
    role: null,
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const {
    data: session,
    isPending,
    refetch,
  } = authClient.useSession()

  const [isSubmitting, setIsSubmitting] = useState(false)

  const user = useMemo(
    () => toUser(session?.user),
    [session?.user],
  )

  const isLoading = isPending || isSubmitting

  const login = useCallback(
    async (email: string, password: string) => {
      setIsSubmitting(true)

      try {
        const { error } = await authClient.signIn.email({
          email: email.trim(),
          password,
        })

        if (error) {
          throw new Error(
            getErrorMessage(error, 'Incorrect email or password.'),
          )
        }

        await refetch()
      } finally {
        setIsSubmitting(false)
      }
    },
    [refetch],
  )

  const signup = useCallback(
    async (name: string, email: string, password: string) => {
      setIsSubmitting(true)

      try {
        const { error } = await authClient.signUp.email({
          name: name.trim(),
          email: email.trim(),
          password,
        })

        if (error) {
          throw new Error(
            getErrorMessage(error, 'Unable to create account.'),
          )
        }

        await refetch()
      } finally {
        setIsSubmitting(false)
      }
    },
    [refetch],
  )

  const logout = useCallback(async () => {
    setIsSubmitting(true)

    try {
      const { error } = await authClient.signOut()

      if (error) {
        throw new Error(
          getErrorMessage(error, 'Unable to sign out.'),
        )
      }

      await refetch()
    } finally {
      setIsSubmitting(false)
    }
  }, [refetch])

  const value = useMemo(
    () => ({ user, isLoading, login, signup, logout }),
    [user, isLoading, login, signup, logout],
  )

  return <AuthContext value={value}>{children}</AuthContext>
}