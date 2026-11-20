// DEMO ONLY: fakes authentication against hardcoded + locally-registered
// accounts and stores everything in localStorage. The public API
// (user, isLoading, login, signup, logout, saveProfile) is provider-agnostic
// so a real backend (Supabase via FastAPI) can replace only this file's body.
import { useCallback, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import type { Profile, SignupInput, User } from './types'
import { AuthContext } from './useAuth'
import { DEMO_PASSWORD, demoUsers } from './demoUsers'

const SESSION_KEY = 'beaverlink.demo.user'
const ACCOUNTS_KEY = 'beaverlink.demo.accounts'
const PROFILES_KEY = 'beaverlink.demo.profiles'
const FAKE_DELAY_MS = 500

interface StoredAccount {
  email: string
  password: string
  user: User
}

function readJSON<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}

function writeJSON(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // Ignore storage failures (private mode, quota).
  }
}

function readSession(): User | null {
  return readJSON<User | null>(SESSION_KEY, null)
}

function sameEmail(a: string, b: string): boolean {
  return a.trim().toLowerCase() === b.trim().toLowerCase()
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(readSession)
  const [isLoading, setIsLoading] = useState(false)

  const persistSession = useCallback((next: User | null) => {
    setUser(next)
    if (next) writeJSON(SESSION_KEY, next)
    else localStorage.removeItem(SESSION_KEY)
  }, [])

  const login = useCallback(
    async (email: string, password: string) => {
      setIsLoading(true)
      try {
        await new Promise((r) => setTimeout(r, FAKE_DELAY_MS))

        const demo = demoUsers.find((u) => sameEmail(u.email, email))
        if (demo && password === DEMO_PASSWORD) {
          persistSession({
            id: demo.id,
            name: demo.name,
            email: demo.email,
            role: demo.role,
            hasProfile: true, // demo accounts come pre-provisioned
          })
          return
        }

        const accounts = readJSON<StoredAccount[]>(ACCOUNTS_KEY, [])
        const account = accounts.find((a) => sameEmail(a.email, email))
        if (!account || account.password !== password) {
          throw new Error('Incorrect email or password.')
        }
        persistSession(account.user)
      } finally {
        setIsLoading(false)
      }
    },
    [persistSession],
  )

  const signup = useCallback(
    async ({ email, password, name, role }: SignupInput) => {
      setIsLoading(true)
      try {
        await new Promise((r) => setTimeout(r, FAKE_DELAY_MS))

        const accounts = readJSON<StoredAccount[]>(ACCOUNTS_KEY, [])
        const taken =
          demoUsers.some((u) => sameEmail(u.email, email)) ||
          accounts.some((a) => sameEmail(a.email, email))
        if (taken) {
          throw new Error('An account with this email already exists.')
        }

        const newUser: User = {
          id: `u-${Date.now()}`,
          name: name.trim(),
          email: email.trim(),
          role,
          hasProfile: false,
        }
        writeJSON(ACCOUNTS_KEY, [...accounts, { email: newUser.email, password, user: newUser }])
        persistSession(newUser)
      } finally {
        setIsLoading(false)
      }
    },
    [persistSession],
  )

  const saveProfile = useCallback(
    (profile: Profile) => {
      if (!user) return
      const profiles = readJSON<Record<string, Profile>>(PROFILES_KEY, {})
      writeJSON(PROFILES_KEY, { ...profiles, [user.id]: profile })

      const updated: User = { ...user, hasProfile: true, avatarUrl: profile.avatarUrl }
      const accounts = readJSON<StoredAccount[]>(ACCOUNTS_KEY, [])
      writeJSON(
        ACCOUNTS_KEY,
        accounts.map((a) => (a.user.id === updated.id ? { ...a, user: updated } : a)),
      )
      persistSession(updated)
    },
    [user, persistSession],
  )

  const logout = useCallback(() => persistSession(null), [persistSession])

  const value = useMemo(
    () => ({ user, isLoading, login, signup, logout, saveProfile }),
    [user, isLoading, login, signup, logout, saveProfile],
  )

  return <AuthContext value={value}>{children}</AuthContext>
}
