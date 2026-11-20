# Login, Sign-up & Profile Onboarding Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a stepped sign-up flow (student / alum / guest) that flows into role-specific profile creation — including a LinkedIn-style, optional work-experience and education history — plus a restyled sign-in, all on the existing mock `AuthProvider`.

**Architecture:** Frontend-only, Phase 1. Auth stays behind the provider-agnostic `AuthProvider` (localStorage mock) — no `@supabase/supabase-js`, no backend. Sign-up registers a mock account with `hasProfile: false`; `ProtectedRoute` forces profile-less users into `/onboarding/profile`; saving the profile flips `hasProfile` and lands the user on `/home`. The profile form carries two optional LinkedIn-style list editors (`ExperienceEditor`, `EducationEditor`) for add/edit/remove entries, stored as arrays on `Profile`.

**Added without a live check-in:** the experience/education history feature was requested while the project owner was unavailable to answer design questions overnight. Reasonable defaults were chosen (optional, not required to finish onboarding; free-text dates, not date pickers; no modal, inline add-form) and are called out in Tasks 7–8 and in the spec for morning review.

**Tech Stack:** React 19, React Router 7, TypeScript, Tailwind v4 (`@theme` tokens), Vitest + Testing Library.

## Global Constraints

- **No `@supabase/supabase-js` import anywhere in `frontend/`** (risk R5, High impact). Phase 1 is mock/local only.
- **Fake data only** — no real names/emails in code or fixtures (NFR-1 / C-1 / R2).
- **Branch:** `feat/login-signup` (already created off `dev`). Do **not** push; the user pushes.
- **Light mode only** for the new auth/onboarding UI (committed single theme).
- **Palette/tokens:** Beaver-Orange `--color-osu #d73f09`, `--color-osu-dark`, `--color-osu-tint`, `--color-ink`, `--color-paper`, plus new `--color-bark #8a5a34` / `--color-bark-tint #f4ebe1`. Near-black headings, orange actions/selection, brown labels.
- **Accessibility:** every input keeps a programmatic label (`getByLabelText` must keep working); keyboard focus visible.
- **Role values:** `User.role` uses `'alumnus'` (not `'alum'`); self-serve roles are `student | alumnus | guest`; `admin` is provisioned (demo only), never a sign-up option.
- **No logo asset yet.** There is no dedicated BeaverLink logo; reuse the existing `Logo` component (drawn connection mark + wordmark) as the placeholder everywhere. Do not add or invent a logo image.
- **Password policy (sign-up):** at least 8 characters with an uppercase letter, a lowercase letter, a number, and a special symbol — regex `^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$`. Enforced in `SignupPage` only; the mock `AuthProvider` stores whatever it's given.
- **Commits:** Conventional prefixes (`feat:` / `refactor:` / `docs:`), end every commit message with `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`. Frequent commits (one per task).
- **CI parity before done:** `cd frontend && npx tsc -b && npm run lint && npm run test && npm run build` all green.

---

### Task 1: Brand tokens + auth type model

**Files:**
- Modify: `frontend/src/index.css` (add bark tokens)
- Modify: `frontend/src/auth/types.ts`
- Modify: `frontend/src/components/RoleBadge.tsx` (add `guest` to `Record<Role>` so `tsc` passes)
- Test: `frontend/src/components/RoleBadge.test.tsx` (new)

**Interfaces:**
- Produces:
  - `type Role = 'student' | 'alumnus' | 'guest' | 'admin'`
  - `type SignupRole = 'student' | 'alumnus' | 'guest'`
  - `interface User { id: string; name: string; email: string; role: Role; hasProfile: boolean; avatarUrl?: string }`
  - `interface ExperienceEntry { id: string; title: string; company: string; location?: string; startDate: string; endDate?: string; current: boolean; description?: string }`
  - `interface EducationEntry { id: string; school: string; degree?: string; fieldOfStudy?: string; startYear: string; endYear?: string; description?: string }`
  - `interface Profile { location: string; linkedinUrl?: string; goals: string[]; goalDetails?: string; avatarUrl?: string; studentYear?: string; major?: string; graduationYear?: string; industry?: string; otherIndustry?: string; company?: string; jobTitle?: string; position?: string; experience: ExperienceEntry[]; education: EducationEntry[]; source: 'manual' }`
  - `interface SignupInput { email: string; password: string; name: string; role: SignupRole }`
  - `interface AuthContextValue { user: User | null; isLoading: boolean; login(email, password): Promise<void>; signup(input: SignupInput): Promise<void>; logout(): void; saveProfile(profile: Profile): void }`

- [ ] **Step 1: Write the failing test** — `frontend/src/components/RoleBadge.test.tsx`

```tsx
import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { RoleBadge } from './RoleBadge'

describe('RoleBadge', () => {
  it('renders a label for the guest role', () => {
    render(<RoleBadge role="guest" />)
    expect(screen.getByText('Guest')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd frontend && npx vitest run src/components/RoleBadge.test.tsx`
Expected: FAIL / type error — `'guest'` not assignable to `Role`.

- [ ] **Step 3: Add bark tokens** — in `frontend/src/index.css`, inside `@theme { … }`, after `--color-paper`:

```css
  --color-bark: #8a5a34;
  --color-bark-tint: #f4ebe1;
```

- [ ] **Step 4: Replace `frontend/src/auth/types.ts` with the full model**

```ts
// Roles map to how BeaverLink treats each kind of attendee.
export type Role = 'student' | 'alumnus' | 'guest' | 'admin'

// Roles a visitor can pick during self-serve sign-up (admin is provisioned).
export type SignupRole = 'student' | 'alumnus' | 'guest'

export interface User {
  id: string
  name: string
  email: string
  role: Role
  hasProfile: boolean
  avatarUrl?: string
}

// One flat, role-aware shape. Only the fields for a user's role are filled in.
export interface Profile {
  // common
  location: string
  linkedinUrl?: string
  goals: string[]
  goalDetails?: string
  avatarUrl?: string
  // student
  studentYear?: string
  major?: string
  // alum
  graduationYear?: string
  industry?: string
  otherIndustry?: string
  company?: string
  jobTitle?: string
  // guest
  position?: string
  // LinkedIn-style history, all roles, optional (Task 7/8)
  experience: ExperienceEntry[]
  education: EducationEntry[]
  // which source filled this profile (RFC Option D swappability)
  source: 'manual'
}

// A single work-experience entry (LinkedIn-style). `current: true` means the
// person still works there and `endDate` is unused.
export interface ExperienceEntry {
  id: string
  title: string
  company: string
  location?: string
  startDate: string
  endDate?: string
  current: boolean
  description?: string
}

// A single education entry (LinkedIn-style).
export interface EducationEntry {
  id: string
  school: string
  degree?: string
  fieldOfStudy?: string
  startYear: string
  endYear?: string
  description?: string
}

export interface SignupInput {
  email: string
  password: string
  name: string
  role: SignupRole
}

export interface AuthContextValue {
  user: User | null
  isLoading: boolean
  login: (email: string, password: string) => Promise<void>
  signup: (input: SignupInput) => Promise<void>
  logout: () => void
  saveProfile: (profile: Profile) => void
}
```

- [ ] **Step 5: Add the `guest` entry to `RoleBadge.tsx`** — in `roleStyles`, after the `student` entry:

```tsx
  guest: {
    label: 'Guest',
    className: 'bg-bark-tint text-bark ring-bark/20',
  },
```

- [ ] **Step 6: Run test to verify it passes**

Run: `cd frontend && npx vitest run src/components/RoleBadge.test.tsx`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add frontend/src/index.css frontend/src/auth/types.ts frontend/src/components/RoleBadge.tsx frontend/src/components/RoleBadge.test.tsx
git commit -m "feat: add guest role, profile types, and bark brand tokens

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 2: AuthProvider — signup, mock profile store, saveProfile

**Files:**
- Modify: `frontend/src/auth/AuthProvider.tsx`
- Test: `frontend/src/auth/AuthProvider.test.tsx` (new)

**Interfaces:**
- Consumes: `User`, `Profile`, `SignupInput`, `AuthContextValue` (Task 1); `demoUsers`, `DEMO_PASSWORD`.
- Produces: `AuthProvider` whose context value matches `AuthContextValue`. Demo accounts resolve with `hasProfile: true`. New sign-ups resolve with `hasProfile: false` until `saveProfile` is called. Duplicate-email signup rejects with `Error('An account with this email already exists.')`. Login failure throws `Error('Incorrect email or password.')`.

- [ ] **Step 1: Write the failing test** — `frontend/src/auth/AuthProvider.test.tsx`

```tsx
import { describe, expect, it, beforeEach } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import { useAuth } from './useAuth'
import { AuthProvider } from './AuthProvider'
import type { AuthContextValue } from './types'

// Grab the live context value so we can drive signup/saveProfile directly.
let ctx: AuthContextValue
function Probe() {
  ctx = useAuth()
  return <span data-testid="state">{ctx.user ? `${ctx.user.email}:${ctx.user.hasProfile}` : 'anon'}</span>
}
function setup() {
  render(<AuthProvider><Probe /></AuthProvider>)
}

describe('AuthProvider signup + profile', () => {
  beforeEach(() => localStorage.clear())

  it('signs up a new user with no profile yet', async () => {
    setup()
    await act(async () => {
      await ctx.signup({ email: 'new@oregonstate.edu', password: 'secret12', name: 'Pat Doe', role: 'guest' })
    })
    expect(screen.getByTestId('state')).toHaveTextContent('new@oregonstate.edu:false')
  })

  it('rejects a duplicate email', async () => {
    setup()
    await act(async () => {
      await ctx.signup({ email: 'dup@oregonstate.edu', password: 'secret12', name: 'A', role: 'student' })
    })
    await expect(
      ctx.signup({ email: 'dup@oregonstate.edu', password: 'other123', name: 'B', role: 'student' }),
    ).rejects.toThrow('already exists')
  })

  it('saveProfile flips hasProfile to true', async () => {
    setup()
    await act(async () => {
      await ctx.signup({ email: 'p@oregonstate.edu', password: 'secret12', name: 'Pat', role: 'student' })
    })
    act(() => {
      ctx.saveProfile({ location: 'Corvallis, OR', goals: ['Find a mentor'], studentYear: 'Third year', major: 'CS', experience: [], education: [], source: 'manual' })
    })
    expect(screen.getByTestId('state')).toHaveTextContent('p@oregonstate.edu:true')
  })

  it('logs in a demo account with a profile already present', async () => {
    setup()
    await act(async () => { await ctx.login('student@oregonstate.edu', 'demo1234') })
    expect(screen.getByTestId('state')).toHaveTextContent('student@oregonstate.edu:true')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd frontend && npx vitest run src/auth/AuthProvider.test.tsx`
Expected: FAIL — `ctx.signup`/`ctx.saveProfile` are not functions.

- [ ] **Step 3: Replace `frontend/src/auth/AuthProvider.tsx`**

```tsx
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd frontend && npx vitest run src/auth/AuthProvider.test.tsx`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add frontend/src/auth/AuthProvider.tsx frontend/src/auth/AuthProvider.test.tsx
git commit -m "feat: add signup and mock profile store to AuthProvider

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 3: ProtectedRoute — force onboarding when profile missing

**Files:**
- Modify: `frontend/src/auth/ProtectedRoute.tsx`
- Test: `frontend/src/auth/ProtectedRoute.test.tsx` (new)

**Interfaces:**
- Consumes: `useAuth`, `User.hasProfile`.
- Produces: `ProtectedRoute({ children, requireProfile = true })`. Not signed in → `/login`. Signed in but `requireProfile && !hasProfile` → `/onboarding/profile`. Otherwise renders children.

- [ ] **Step 1: Write the failing test** — `frontend/src/auth/ProtectedRoute.test.tsx`

```tsx
import { describe, expect, it, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './AuthProvider'
import { ProtectedRoute } from './ProtectedRoute'

function seedSession(hasProfile: boolean) {
  localStorage.setItem(
    'beaverlink.demo.user',
    JSON.stringify({ id: 'u-1', name: 'Pat', email: 'p@x.edu', role: 'guest', hasProfile }),
  )
}

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <AuthProvider>
        <Routes>
          <Route path="/home" element={<ProtectedRoute><p>home</p></ProtectedRoute>} />
          <Route path="/onboarding/profile" element={<p>onboarding</p>} />
          <Route path="/login" element={<p>login</p>} />
        </Routes>
      </AuthProvider>
    </MemoryRouter>,
  )
}

describe('ProtectedRoute', () => {
  beforeEach(() => localStorage.clear())

  it('sends a signed-out user to /login', () => {
    renderAt('/home')
    expect(screen.getByText('login')).toBeInTheDocument()
  })

  it('sends a profile-less user to onboarding', () => {
    seedSession(false)
    renderAt('/home')
    expect(screen.getByText('onboarding')).toBeInTheDocument()
  })

  it('lets a user with a profile through', () => {
    seedSession(true)
    renderAt('/home')
    expect(screen.getByText('home')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd frontend && npx vitest run src/auth/ProtectedRoute.test.tsx`
Expected: FAIL — profile-less user reaches `home`, not `onboarding`.

- [ ] **Step 3: Replace `frontend/src/auth/ProtectedRoute.tsx`**

```tsx
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd frontend && npx vitest run src/auth/ProtectedRoute.test.tsx`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add frontend/src/auth/ProtectedRoute.tsx frontend/src/auth/ProtectedRoute.test.tsx
git commit -m "feat: redirect profile-less users to onboarding in ProtectedRoute

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 4: Shared auth-card shell (`AuthCard`, `StepDots`)

**Files:**
- Create: `frontend/src/components/auth/AuthCard.tsx`
- Create: `frontend/src/components/auth/StepDots.tsx`
- Test: `frontend/src/components/auth/AuthCard.test.tsx` (new)

**Interfaces:**
- Produces:
  - `StepDots({ total: number; current: number })` — renders `total` segments; `0..current-1` "done" (bark), `current` "on" (osu), rest neutral.
  - `AuthCard({ title, subtitle?, onBack?, children })` — centered white card on the light ground with the logo, optional back button (aria-label "Back"), title `<h1>`, subtitle, and children.

- [ ] **Step 1: Write the failing test** — `frontend/src/components/auth/AuthCard.test.tsx`

```tsx
import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AuthCard } from './AuthCard'

describe('AuthCard', () => {
  it('renders the title and calls onBack', async () => {
    const onBack = vi.fn()
    render(<AuthCard title="Choose a password" onBack={onBack}><p>body</p></AuthCard>)
    expect(screen.getByRole('heading', { name: 'Choose a password' })).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Back' }))
    expect(onBack).toHaveBeenCalled()
  })

  it('omits the back button when no onBack is given', () => {
    render(<AuthCard title="Sign in"><p>body</p></AuthCard>)
    expect(screen.queryByRole('button', { name: 'Back' })).toBeNull()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd frontend && npx vitest run src/components/auth/AuthCard.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Create `frontend/src/components/auth/StepDots.tsx`**

```tsx
// Progress indicator for the sign-up steps: completed = bark, current = osu.
export function StepDots({ total, current }: { total: number; current: number }) {
  return (
    <div className="mt-6 flex justify-center gap-1.5" aria-hidden="true">
      {Array.from({ length: total }, (_, i) => {
        const tone =
          i < current ? 'bg-bark' : i === current ? 'bg-osu' : 'bg-stone-200'
        return <span key={i} className={`h-1.5 w-8 rounded-full ${tone}`} />
      })}
    </div>
  )
}
```

- [ ] **Step 4: Create `frontend/src/components/auth/AuthCard.tsx`**

```tsx
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
            className="absolute left-5 top-5 grid h-10 w-10 place-items-center rounded-xl text-stone-500 hover:bg-bark-tint hover:text-ink"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
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
```

- [ ] **Step 5: Run test to verify it passes**

Run: `cd frontend && npx vitest run src/components/auth/AuthCard.test.tsx`
Expected: PASS (2 tests).

- [ ] **Step 6: Commit**

```bash
git add frontend/src/components/auth/
git commit -m "feat: add shared AuthCard and StepDots shell

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 5: Sign-up page (3 steps: email → password → name + role)

**Files:**
- Create: `frontend/src/pages/SignupPage.tsx`
- Modify: `frontend/src/App.tsx` (add `/signup` route only)
- Test: `frontend/src/pages/SignupPage.test.tsx` (new)

**Interfaces:**
- Consumes: `useAuth().signup`, `AuthCard`, `StepDots`, `Input`, `Button`, `SignupRole`.
- Produces: `SignupPage` at `/signup`. Step state 0/1/2. Submitting step 3 calls `signup({ email, password, name, role })` then navigates to `/onboarding/profile`. Already-signed-in visitors redirect to `/home`.

- [ ] **Step 1: Write the failing test** — `frontend/src/pages/SignupPage.test.tsx`

```tsx
import { describe, expect, it, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from '../auth/AuthProvider'
import { SignupPage } from './SignupPage'

function renderSignup() {
  return render(
    <MemoryRouter initialEntries={['/signup']}>
      <AuthProvider>
        <Routes>
          <Route path="/signup" element={<SignupPage />} />
          <Route path="/onboarding/profile" element={<p>onboarding</p>} />
        </Routes>
      </AuthProvider>
    </MemoryRouter>,
  )
}

describe('SignupPage', () => {
  beforeEach(() => localStorage.clear())

  it('walks through all three steps and lands on onboarding', async () => {
    const u = userEvent.setup()
    renderSignup()

    await u.type(screen.getByLabelText('Email'), 'new@oregonstate.edu')
    await u.click(screen.getByRole('button', { name: 'Next' }))

    await u.type(screen.getByLabelText('Password'), 'Secret12!')
    await u.type(screen.getByLabelText('Confirm password'), 'Secret12!')
    await u.click(screen.getByRole('button', { name: 'Next' }))

    await u.type(screen.getByLabelText('Full name'), 'Pat Doe')
    await u.click(screen.getByRole('button', { name: 'Guest' }))
    await u.click(screen.getByRole('button', { name: 'Create account' }))

    expect(await screen.findByText('onboarding')).toBeInTheDocument()
  })

  it('blocks a mismatched password confirmation', async () => {
    const u = userEvent.setup()
    renderSignup()
    await u.type(screen.getByLabelText('Email'), 'new@oregonstate.edu')
    await u.click(screen.getByRole('button', { name: 'Next' }))
    await u.type(screen.getByLabelText('Password'), 'Secret12!')
    await u.type(screen.getByLabelText('Confirm password'), 'Secret12?')
    await u.click(screen.getByRole('button', { name: 'Next' }))
    expect(screen.getByText('Passwords do not match.')).toBeInTheDocument()
  })

  it('rejects a password that misses the complexity rule', async () => {
    const u = userEvent.setup()
    renderSignup()
    await u.type(screen.getByLabelText('Email'), 'new@oregonstate.edu')
    await u.click(screen.getByRole('button', { name: 'Next' }))
    await u.type(screen.getByLabelText('Password'), 'weakpass')
    await u.type(screen.getByLabelText('Confirm password'), 'weakpass')
    await u.click(screen.getByRole('button', { name: 'Next' }))
    expect(screen.getByText(/uppercase letter/i)).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd frontend && npx vitest run src/pages/SignupPage.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Create `frontend/src/pages/SignupPage.tsx`**

```tsx
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

  if (user) return <Navigate to="/home" replace />

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
```

- [ ] **Step 4: Add the `/signup` route** — in `frontend/src/App.tsx`, import and add the route after `/login`:

```tsx
import { SignupPage } from './pages/SignupPage'
// …
      <Route path="/signup" element={<SignupPage />} />
```

- [ ] **Step 5: Run test to verify it passes**

Run: `cd frontend && npx vitest run src/pages/SignupPage.test.tsx`
Expected: PASS (2 tests).

- [ ] **Step 6: Commit**

```bash
git add frontend/src/pages/SignupPage.tsx frontend/src/pages/SignupPage.test.tsx frontend/src/App.tsx
git commit -m "feat: add 3-step sign-up page with student/alum/guest roles

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 6: Avatar upload + role-specific profile form

**Files:**
- Create: `frontend/src/components/profile/AvatarUpload.tsx`
- Create: `frontend/src/components/profile/ProfileForm.tsx`
- Test: `frontend/src/components/profile/ProfileForm.test.tsx` (new)

**Interfaces:**
- Consumes: `Profile`, `SignupRole`, `SuggestionInput`, `majors`.
- Produces:
  - `AvatarUpload({ name, value, onChange })` — circular well showing the initial or `value` (data-URL); file picker labeled "Add a profile photo"; resizes to ≤256px and calls `onChange(dataUrl)`.
  - `ProfileForm({ role, userName, initial?, submitLabel, onSubmit })` where `role: SignupRole` and `userName: string` (the signed-in user's display name, used only for the avatar-well initial — `Profile` has no name field). Renders the two-column, role-specific fields + goals and calls `onSubmit(profile: Profile)` when valid.
  - `goalOptions: Record<SignupRole, string[]>`, `industries: string[]`, `studentYears: string[]` exported for reuse/tests.

- [ ] **Step 1: Write the failing test** — `frontend/src/components/profile/ProfileForm.test.tsx`

```tsx
import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ProfileForm } from './ProfileForm'

describe('ProfileForm', () => {
  it('shows guest-specific fields and submits a profile', async () => {
    const onSubmit = vi.fn()
    const u = userEvent.setup()
    render(<ProfileForm role="guest" userName="Riley Guest" submitLabel="Continue" onSubmit={onSubmit} />)

    // Guest fields present; student-only field absent.
    expect(screen.getByLabelText('Company / organization')).toBeInTheDocument()
    expect(screen.queryByLabelText('Year')).toBeNull()

    await u.type(screen.getByLabelText('Company / organization'), 'Rivian')
    await u.type(screen.getByLabelText('Position / title'), 'Recruiter')
    await u.type(screen.getByLabelText('Location'), 'Seattle, WA')
    await u.click(screen.getByRole('checkbox', { name: 'Grow my network' }))
    await u.click(screen.getByRole('button', { name: 'Continue' }))

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ company: 'Rivian', position: 'Recruiter', location: 'Seattle, WA', source: 'manual' }),
    )
  })

  it('requires at least one goal', async () => {
    const onSubmit = vi.fn()
    const u = userEvent.setup()
    render(<ProfileForm role="student" userName="Pat Student" submitLabel="Continue" onSubmit={onSubmit} />)
    await u.type(screen.getByLabelText('Major'), 'Computer Science')
    await u.type(screen.getByLabelText('Location'), 'Corvallis, OR')
    await u.click(screen.getByRole('button', { name: 'Continue' }))
    expect(screen.getByText('Choose at least one goal.')).toBeInTheDocument()
    expect(onSubmit).not.toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd frontend && npx vitest run src/components/profile/ProfileForm.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Create `frontend/src/components/profile/AvatarUpload.tsx`**

```tsx
import { useId, useRef } from 'react'

// Resizes a picked image to a square data-URL (≤ 256px) for the mock store.
async function toDataUrl(file: File): Promise<string> {
  const bitmap = await createImageBitmap(file)
  const size = Math.min(256, bitmap.width, bitmap.height)
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')
  if (!ctx) return ''
  const sx = (bitmap.width - size) / 2
  const sy = (bitmap.height - size) / 2
  ctx.drawImage(bitmap, sx, sy, size, size, 0, 0, size, size)
  return canvas.toDataURL('image/jpeg', 0.85)
}

export function AvatarUpload({
  name,
  value,
  onChange,
}: {
  name: string
  value?: string
  onChange: (dataUrl: string) => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const id = useId()
  const initial = name.trim().charAt(0).toUpperCase() || '?'

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) return
    onChange(await toDataUrl(file))
  }

  return (
    <div className="flex items-center gap-5">
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="relative grid h-20 w-20 place-items-center overflow-hidden rounded-full border border-stone-300 bg-bark-tint text-2xl font-bold text-bark"
      >
        {value ? (
          <img src={value} alt="" className="h-full w-full object-cover" />
        ) : (
          initial
        )}
        <span className="absolute -bottom-0.5 -right-0.5 grid h-7 w-7 place-items-center rounded-full border-[3px] border-white bg-osu text-white">
          <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
            <circle cx="12" cy="13" r="4" />
          </svg>
        </span>
      </button>
      <label htmlFor={id} className="cursor-pointer text-sm font-semibold text-bark" onClick={() => inputRef.current?.click()}>
        Add a profile photo
      </label>
      <input
        ref={inputRef}
        id={id}
        type="file"
        accept="image/*"
        className="sr-only"
        aria-label="Add a profile photo"
        onChange={handleFile}
      />
    </div>
  )
}
```

- [ ] **Step 4: Create `frontend/src/components/profile/ProfileForm.tsx`**

```tsx
import { useState } from 'react'
import type { FormEvent, ReactNode } from 'react'
import SuggestionInput from '../SuggestionInput'
import { majors } from '../../data/majors'
import { Button } from '../Button'
import { AvatarUpload } from './AvatarUpload'
import type { Profile, SignupRole } from '../../auth/types'

export const studentYears = [
  'First year', 'Second year', 'Third year', 'Fourth year', 'Fifth year or later', 'Graduate student',
]

export const industries = [
  'Agriculture and Natural Resources', 'Arts, Media, and Entertainment', 'Business and Consulting',
  'Construction and Manufacturing', 'Education', 'Energy and Environment', 'Engineering',
  'Finance and Insurance', 'Government and Nonprofit', 'Healthcare', 'Hospitality and Tourism',
  'Marketing and Sales', 'Science and Research', 'Technology', 'Other',
]

export const goalOptions: Record<SignupRole, string[]> = {
  student: ['Find a mentor', 'Find an internship or job', 'Explore career paths', 'Grow my network'],
  alumnus: ['Mentor students', 'Recruit or hire', 'Give career advice', 'Grow my network'],
  guest: ['Recruit or hire', 'Grow my network', 'Mentor students', 'Explore career paths'],
}

const inputClass =
  'h-[52px] w-full rounded-xl border border-stone-300 bg-white px-4 text-base text-ink focus:border-osu focus:outline-none focus:ring-2 focus:ring-osu/30'

function Field({ id, label, optional, error, children }: {
  id: string; label: string; optional?: boolean; error?: string; children: ReactNode
}) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-bark">
        {label}{optional && <span className="font-medium normal-case tracking-normal text-stone-400"> · optional</span>}
      </label>
      {children}
      {error && <p role="alert" className="mt-1 text-sm text-red-600">{error}</p>}
    </div>
  )
}

function emptyProfile(): Profile {
  return { location: '', goals: [], experience: [], education: [], source: 'manual' }
}

export function ProfileForm({
  role,
  userName,
  initial,
  submitLabel,
  onSubmit,
}: {
  role: SignupRole
  userName: string
  initial?: Profile
  submitLabel: string
  onSubmit: (profile: Profile) => void
}) {
  // Merge over emptyProfile() so older/partial saved profiles (missing the
  // history arrays) never crash the history editors below.
  const [profile, setProfile] = useState<Profile>({ ...emptyProfile(), ...initial })
  const [goalError, setGoalError] = useState('')

  function set<K extends keyof Profile>(key: K, value: Profile[K]) {
    setProfile((p) => ({ ...p, [key]: value }))
  }

  function toggleGoal(goal: string) {
    setProfile((p) => ({
      ...p,
      goals: p.goals.includes(goal) ? p.goals.filter((g) => g !== goal) : [...p.goals, goal],
    }))
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (profile.goals.length === 0) return setGoalError('Choose at least one goal.')
    setGoalError('')
    onSubmit(profile)
  }

  return (
    <form className="mt-6" noValidate onSubmit={handleSubmit}>
      <div className="mb-6">
        <AvatarUpload name={userName} value={profile.avatarUrl} onChange={(url) => set('avatarUrl', url)} />
      </div>

      <div className="grid grid-cols-1 gap-x-7 gap-y-5 sm:grid-cols-2">
        {role === 'student' && (
          <>
            <Field id="studentYear" label="Year">
              <select id="studentYear" className={inputClass} value={profile.studentYear ?? ''} onChange={(e) => set('studentYear', e.target.value)}>
                <option value="">Select one</option>
                {studentYears.map((y) => <option key={y} value={y}>{y}</option>)}
              </select>
            </Field>
            <Field id="major" label="Major">
              <SuggestionInput id="major" className={inputClass} options={majors} placeholder="Start typing or enter your own" value={profile.major ?? ''} onChange={(v) => set('major', v)} />
            </Field>
          </>
        )}

        {role === 'alumnus' && (
          <>
            <Field id="graduationYear" label="Graduation year">
              <input id="graduationYear" inputMode="numeric" maxLength={4} className={inputClass} value={profile.graduationYear ?? ''} onChange={(e) => set('graduationYear', e.target.value)} />
            </Field>
            <Field id="industry" label="Industry">
              <select id="industry" className={inputClass} value={profile.industry ?? ''} onChange={(e) => set('industry', e.target.value)}>
                <option value="">Select one</option>
                {industries.map((i) => <option key={i} value={i}>{i}</option>)}
              </select>
            </Field>
            <Field id="company" label="Company">
              <input id="company" className={inputClass} value={profile.company ?? ''} onChange={(e) => set('company', e.target.value)} />
            </Field>
            <Field id="jobTitle" label="Job title">
              <input id="jobTitle" className={inputClass} value={profile.jobTitle ?? ''} onChange={(e) => set('jobTitle', e.target.value)} />
            </Field>
          </>
        )}

        {role === 'guest' && (
          <>
            <Field id="company" label="Company / organization">
              <input id="company" className={inputClass} value={profile.company ?? ''} onChange={(e) => set('company', e.target.value)} />
            </Field>
            <Field id="position" label="Position / title">
              <input id="position" className={inputClass} value={profile.position ?? ''} onChange={(e) => set('position', e.target.value)} />
            </Field>
            <Field id="industry" label="Industry">
              <select id="industry" className={inputClass} value={profile.industry ?? ''} onChange={(e) => set('industry', e.target.value)}>
                <option value="">Select one</option>
                {industries.map((i) => <option key={i} value={i}>{i}</option>)}
              </select>
            </Field>
          </>
        )}

        <Field id="location" label="Location">
          <input id="location" className={inputClass} value={profile.location} onChange={(e) => set('location', e.target.value)} />
        </Field>
        <Field id="linkedinUrl" label="LinkedIn" optional>
          <input id="linkedinUrl" className={inputClass} placeholder="linkedin.com/in/…" value={profile.linkedinUrl ?? ''} onChange={(e) => set('linkedinUrl', e.target.value)} />
        </Field>
      </div>

      <fieldset className="mt-7">
        <legend className="mb-2 text-xs font-bold uppercase tracking-wide text-bark">Goals</legend>
        <div className="grid grid-cols-1 gap-x-7 gap-y-3 sm:grid-cols-2">
          {goalOptions[role].map((goal) => (
            <label key={goal} className="flex items-center gap-3 text-[15px] text-ink">
              <input type="checkbox" className="h-5 w-5 rounded accent-osu" checked={profile.goals.includes(goal)} onChange={() => toggleGoal(goal)} />
              {goal}
            </label>
          ))}
        </div>
        {goalError && <p role="alert" className="mt-2 text-sm text-red-600">{goalError}</p>}
      </fieldset>

      <Button type="submit" className="mt-8 w-full">{submitLabel}</Button>
    </form>
  )
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `cd frontend && npx vitest run src/components/profile/ProfileForm.test.tsx`
Expected: PASS (2 tests).

> Note: `createImageBitmap` isn't exercised by these tests (no file upload); no jsdom polyfill needed. If a later test uploads a file, stub it with `vi.stubGlobal`.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/components/profile/
git commit -m "feat: add avatar upload and role-specific profile form

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 7: ExperienceEditor (LinkedIn-style work history)

**Files:**
- Create: `frontend/src/components/profile/ExperienceEditor.tsx`
- Test: `frontend/src/components/profile/ExperienceEditor.test.tsx` (new)

**Interfaces:**
- Consumes: `ExperienceEntry` (Task 1).
- Produces: `ExperienceEditor({ value: ExperienceEntry[]; onChange: (next: ExperienceEntry[]) => void })`. Renders existing entries as cards (title · company, dates, optional description) with "Edit" and "Remove" buttons, plus an "+ Add experience" button that reveals an inline form (title, company, location optional, start, "I currently work here" checkbox, end — hidden/cleared when current, description optional). Saving the inline form appends or updates an entry (by `id`, generated with `crypto.randomUUID()`) and calls `onChange` with the new array; Cancel discards the in-progress entry without calling `onChange`.

- [ ] **Step 1: Write the failing test** — `frontend/src/components/profile/ExperienceEditor.test.tsx`

```tsx
import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ExperienceEditor } from './ExperienceEditor'

describe('ExperienceEditor', () => {
  it('starts empty and adds an entry', async () => {
    const onChange = vi.fn()
    const u = userEvent.setup()
    render(<ExperienceEditor value={[]} onChange={onChange} />)

    expect(screen.getByText('No experience added yet.')).toBeInTheDocument()
    await u.click(screen.getByRole('button', { name: '+ Add experience' }))

    await u.type(screen.getByLabelText('Title'), 'Software Engineering Intern')
    await u.type(screen.getByLabelText('Company'), 'Rivian')
    await u.type(screen.getByLabelText('Start date'), 'Jun 2025')
    await u.click(screen.getByRole('checkbox', { name: 'I currently work here' }))
    await u.click(screen.getByRole('button', { name: 'Save experience' }))

    expect(onChange).toHaveBeenCalledWith([
      expect.objectContaining({ title: 'Software Engineering Intern', company: 'Rivian', startDate: 'Jun 2025', current: true }),
    ])
  })

  it('renders an existing entry with remove support', async () => {
    const onChange = vi.fn()
    const u = userEvent.setup()
    const entry = { id: '1', title: 'PM', company: 'Nike', startDate: 'Jan 2020', endDate: 'Dec 2022', current: false }
    render(<ExperienceEditor value={[entry]} onChange={onChange} />)

    expect(screen.getByText('PM · Nike')).toBeInTheDocument()
    await u.click(screen.getByRole('button', { name: 'Remove PM at Nike' }))
    expect(onChange).toHaveBeenCalledWith([])
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd frontend && npx vitest run src/components/profile/ExperienceEditor.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Create `frontend/src/components/profile/ExperienceEditor.tsx`**

```tsx
import { useState } from 'react'
import type { ExperienceEntry } from '../../auth/types'
import { Button } from '../Button'

const inputClass =
  'h-[46px] w-full rounded-xl border border-stone-300 bg-white px-3.5 text-sm text-ink focus:border-osu focus:outline-none focus:ring-2 focus:ring-osu/30'

function emptyDraft(): Omit<ExperienceEntry, 'id'> {
  return { title: '', company: '', location: '', startDate: '', endDate: '', current: false, description: '' }
}

export function ExperienceEditor({
  value,
  onChange,
}: {
  value: ExperienceEntry[]
  onChange: (next: ExperienceEntry[]) => void
}) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [adding, setAdding] = useState(false)
  const [draft, setDraft] = useState<Omit<ExperienceEntry, 'id'>>(emptyDraft())

  function startAdd() {
    setDraft(emptyDraft())
    setEditingId(null)
    setAdding(true)
  }

  function startEdit(entry: ExperienceEntry) {
    const { id, ...rest } = entry
    setDraft(rest)
    setEditingId(id)
    setAdding(true)
  }

  function cancel() {
    setAdding(false)
    setEditingId(null)
  }

  function save() {
    if (editingId) {
      onChange(value.map((e) => (e.id === editingId ? { id: editingId, ...draft } : e)))
    } else {
      onChange([...value, { id: crypto.randomUUID(), ...draft }])
    }
    cancel()
  }

  function remove(id: string) {
    onChange(value.filter((e) => e.id !== id))
  }

  return (
    <div>
      {value.length === 0 && !adding && (
        <p className="text-sm text-stone-500">No experience added yet.</p>
      )}

      <div className="flex flex-col gap-3">
        {value.map((entry) => (
          <div key={entry.id} className="rounded-xl border border-stone-200 bg-white p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-semibold text-ink">{entry.title} · {entry.company}</p>
                <p className="text-sm text-stone-500">
                  {entry.startDate} – {entry.current ? 'Present' : entry.endDate}
                </p>
              </div>
              <div className="flex gap-2">
                <button type="button" className="text-sm font-semibold text-osu" onClick={() => startEdit(entry)}>Edit</button>
                <button
                  type="button"
                  aria-label={`Remove ${entry.title} at ${entry.company}`}
                  className="text-sm font-semibold text-stone-400 hover:text-red-600"
                  onClick={() => remove(entry.id)}
                >
                  Remove
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {adding ? (
        <div className="mt-3 rounded-xl border border-stone-200 bg-white p-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="flex flex-col gap-1 text-xs font-semibold text-bark">
              Title
              <input className={inputClass} value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} />
            </label>
            <label className="flex flex-col gap-1 text-xs font-semibold text-bark">
              Company
              <input className={inputClass} value={draft.company} onChange={(e) => setDraft({ ...draft, company: e.target.value })} />
            </label>
            <label className="flex flex-col gap-1 text-xs font-semibold text-bark">
              Location
              <input className={inputClass} value={draft.location} onChange={(e) => setDraft({ ...draft, location: e.target.value })} />
            </label>
            <label className="flex flex-col gap-1 text-xs font-semibold text-bark">
              Start date
              <input className={inputClass} placeholder="Jun 2025" value={draft.startDate} onChange={(e) => setDraft({ ...draft, startDate: e.target.value })} />
            </label>
            {!draft.current && (
              <label className="flex flex-col gap-1 text-xs font-semibold text-bark">
                End date
                <input className={inputClass} placeholder="Aug 2025" value={draft.endDate} onChange={(e) => setDraft({ ...draft, endDate: e.target.value })} />
              </label>
            )}
            <label className="flex items-center gap-2 self-end text-sm text-ink">
              <input
                type="checkbox"
                className="h-5 w-5 rounded accent-osu"
                checked={draft.current}
                onChange={(e) => setDraft({ ...draft, current: e.target.checked, endDate: e.target.checked ? '' : draft.endDate })}
              />
              I currently work here
            </label>
          </div>
          <label className="mt-3 flex flex-col gap-1 text-xs font-semibold text-bark">
            Description (optional)
            <textarea className="rounded-xl border border-stone-300 bg-white p-3 text-sm" rows={2} value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} />
          </label>
          <div className="mt-3 flex gap-2">
            <Button type="button" onClick={save}>Save experience</Button>
            <Button type="button" variant="secondary" onClick={cancel}>Cancel</Button>
          </div>
        </div>
      ) : (
        <button type="button" onClick={startAdd} className="mt-3 text-sm font-semibold text-osu hover:underline">
          + Add experience
        </button>
      )}
    </div>
  )
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd frontend && npx vitest run src/components/profile/ExperienceEditor.test.tsx`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/profile/ExperienceEditor.tsx frontend/src/components/profile/ExperienceEditor.test.tsx
git commit -m "feat: add LinkedIn-style ExperienceEditor for profile history

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 8: EducationEditor + wire both history editors into ProfileForm

**Files:**
- Create: `frontend/src/components/profile/EducationEditor.tsx`
- Modify: `frontend/src/components/profile/ProfileForm.tsx`
- Test: `frontend/src/components/profile/EducationEditor.test.tsx` (new)
- Test: `frontend/src/components/profile/ProfileForm.test.tsx` (extend)

**Interfaces:**
- Consumes: `EducationEntry` (Task 1), `ExperienceEditor` (Task 7).
- Produces: `EducationEditor({ value: EducationEntry[]; onChange: (next: EducationEntry[]) => void })`, same card/add-form pattern as `ExperienceEditor` (school, degree optional, field of study optional, start year, end year optional, description optional). `ProfileForm` renders an "Experience" section (`ExperienceEditor`) and an "Education" section (`EducationEditor`) below Goals, wired to `profile.experience` / `profile.education` via `set('experience', …)` / `set('education', …)`. Both sections are optional — submitting with zero entries in either is allowed.

- [ ] **Step 1: Write the failing test** — `frontend/src/components/profile/EducationEditor.test.tsx`

```tsx
import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { EducationEditor } from './EducationEditor'

describe('EducationEditor', () => {
  it('starts empty and adds an entry', async () => {
    const onChange = vi.fn()
    const u = userEvent.setup()
    render(<EducationEditor value={[]} onChange={onChange} />)

    expect(screen.getByText('No education added yet.')).toBeInTheDocument()
    await u.click(screen.getByRole('button', { name: '+ Add education' }))

    await u.type(screen.getByLabelText('School'), 'Oregon State University')
    await u.type(screen.getByLabelText('Degree'), 'B.S.')
    await u.type(screen.getByLabelText('Field of study'), 'Computer Science')
    await u.type(screen.getByLabelText('Start year'), '2023')
    await u.click(screen.getByRole('button', { name: 'Save education' }))

    expect(onChange).toHaveBeenCalledWith([
      expect.objectContaining({ school: 'Oregon State University', degree: 'B.S.', fieldOfStudy: 'Computer Science', startYear: '2023' }),
    ])
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd frontend && npx vitest run src/components/profile/EducationEditor.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Create `frontend/src/components/profile/EducationEditor.tsx`**

```tsx
import { useState } from 'react'
import type { EducationEntry } from '../../auth/types'
import { Button } from '../Button'

const inputClass =
  'h-[46px] w-full rounded-xl border border-stone-300 bg-white px-3.5 text-sm text-ink focus:border-osu focus:outline-none focus:ring-2 focus:ring-osu/30'

function emptyDraft(): Omit<EducationEntry, 'id'> {
  return { school: '', degree: '', fieldOfStudy: '', startYear: '', endYear: '', description: '' }
}

export function EducationEditor({
  value,
  onChange,
}: {
  value: EducationEntry[]
  onChange: (next: EducationEntry[]) => void
}) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [adding, setAdding] = useState(false)
  const [draft, setDraft] = useState<Omit<EducationEntry, 'id'>>(emptyDraft())

  function startAdd() {
    setDraft(emptyDraft())
    setEditingId(null)
    setAdding(true)
  }

  function startEdit(entry: EducationEntry) {
    const { id, ...rest } = entry
    setDraft(rest)
    setEditingId(id)
    setAdding(true)
  }

  function cancel() {
    setAdding(false)
    setEditingId(null)
  }

  function save() {
    if (editingId) {
      onChange(value.map((e) => (e.id === editingId ? { id: editingId, ...draft } : e)))
    } else {
      onChange([...value, { id: crypto.randomUUID(), ...draft }])
    }
    cancel()
  }

  function remove(id: string) {
    onChange(value.filter((e) => e.id !== id))
  }

  return (
    <div>
      {value.length === 0 && !adding && (
        <p className="text-sm text-stone-500">No education added yet.</p>
      )}

      <div className="flex flex-col gap-3">
        {value.map((entry) => (
          <div key={entry.id} className="rounded-xl border border-stone-200 bg-white p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-semibold text-ink">{entry.school}</p>
                <p className="text-sm text-stone-500">
                  {[entry.degree, entry.fieldOfStudy].filter(Boolean).join(', ')}
                  {(entry.degree || entry.fieldOfStudy) && ' · '}
                  {entry.startYear}–{entry.endYear || 'present'}
                </p>
              </div>
              <div className="flex gap-2">
                <button type="button" className="text-sm font-semibold text-osu" onClick={() => startEdit(entry)}>Edit</button>
                <button
                  type="button"
                  aria-label={`Remove ${entry.school}`}
                  className="text-sm font-semibold text-stone-400 hover:text-red-600"
                  onClick={() => remove(entry.id)}
                >
                  Remove
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {adding ? (
        <div className="mt-3 rounded-xl border border-stone-200 bg-white p-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="flex flex-col gap-1 text-xs font-semibold text-bark">
              School
              <input className={inputClass} value={draft.school} onChange={(e) => setDraft({ ...draft, school: e.target.value })} />
            </label>
            <label className="flex flex-col gap-1 text-xs font-semibold text-bark">
              Degree
              <input className={inputClass} value={draft.degree} onChange={(e) => setDraft({ ...draft, degree: e.target.value })} />
            </label>
            <label className="flex flex-col gap-1 text-xs font-semibold text-bark">
              Field of study
              <input className={inputClass} value={draft.fieldOfStudy} onChange={(e) => setDraft({ ...draft, fieldOfStudy: e.target.value })} />
            </label>
            <label className="flex flex-col gap-1 text-xs font-semibold text-bark">
              Start year
              <input className={inputClass} inputMode="numeric" maxLength={4} value={draft.startYear} onChange={(e) => setDraft({ ...draft, startYear: e.target.value })} />
            </label>
            <label className="flex flex-col gap-1 text-xs font-semibold text-bark">
              End year (optional)
              <input className={inputClass} inputMode="numeric" maxLength={4} value={draft.endYear} onChange={(e) => setDraft({ ...draft, endYear: e.target.value })} />
            </label>
          </div>
          <label className="mt-3 flex flex-col gap-1 text-xs font-semibold text-bark">
            Description (optional)
            <textarea className="rounded-xl border border-stone-300 bg-white p-3 text-sm" rows={2} value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} />
          </label>
          <div className="mt-3 flex gap-2">
            <Button type="button" onClick={save}>Save education</Button>
            <Button type="button" variant="secondary" onClick={cancel}>Cancel</Button>
          </div>
        </div>
      ) : (
        <button type="button" onClick={startAdd} className="mt-3 text-sm font-semibold text-osu hover:underline">
          + Add education
        </button>
      )}
    </div>
  )
}
```

- [ ] **Step 4: Wire both editors into `ProfileForm.tsx`** — add imports and insert two sections between the closing `</fieldset>` of Goals and the submit `<Button>`:

```tsx
import { ExperienceEditor } from './ExperienceEditor'
import { EducationEditor } from './EducationEditor'
```

```tsx
      <div className="mt-7">
        <p className="mb-2 text-xs font-bold uppercase tracking-wide text-bark">Experience</p>
        <ExperienceEditor value={profile.experience} onChange={(experience) => set('experience', experience)} />
      </div>

      <div className="mt-7">
        <p className="mb-2 text-xs font-bold uppercase tracking-wide text-bark">Education</p>
        <EducationEditor value={profile.education} onChange={(education) => set('education', education)} />
      </div>
```

(Insert immediately after the Goals `</fieldset>` and before `<Button type="submit" …>`.)

- [ ] **Step 5: Extend `ProfileForm.test.tsx`** — add a test confirming the history sections render and are optional:

```tsx
  it('renders empty experience/education sections and submits without any entries', async () => {
    const onSubmit = vi.fn()
    const u = userEvent.setup()
    render(<ProfileForm role="guest" userName="Riley Guest" submitLabel="Continue" onSubmit={onSubmit} />)

    expect(screen.getByText('No experience added yet.')).toBeInTheDocument()
    expect(screen.getByText('No education added yet.')).toBeInTheDocument()

    await u.type(screen.getByLabelText('Company / organization'), 'Rivian')
    await u.type(screen.getByLabelText('Position / title'), 'Recruiter')
    await u.type(screen.getByLabelText('Location'), 'Seattle, WA')
    await u.click(screen.getByRole('checkbox', { name: 'Grow my network' }))
    await u.click(screen.getByRole('button', { name: 'Continue' }))

    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ experience: [], education: [] }))
  })
```

- [ ] **Step 6: Run the whole profile component suite**

Run: `cd frontend && npx vitest run src/components/profile/`
Expected: PASS — `ExperienceEditor.test.tsx`, `EducationEditor.test.tsx`, `ProfileForm.test.tsx` (now 4 tests) all green.

- [ ] **Step 7: Commit**

```bash
git add frontend/src/components/profile/
git commit -m "feat: add EducationEditor and wire experience/education into ProfileForm

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 9: Onboarding page + route wiring + redirects

**Files:**
- Create: `frontend/src/pages/OnboardingProfilePage.tsx`
- Modify: `frontend/src/App.tsx` (add `/onboarding/profile`, protect `/profile`)
- Test: `frontend/src/pages/OnboardingProfilePage.test.tsx` (new)

**Interfaces:**
- Consumes: `useAuth()` (`user`, `saveProfile`), `AuthCard`, `ProfileForm`, `SignupRole`.
- Produces: `OnboardingProfilePage` at `/onboarding/profile`. Maps `user.role` → form role (`admin` falls back to `student` for the form, but admins never onboard). If `user.hasProfile` already true → `Navigate` to `/home`. On submit, `saveProfile(profile)` then navigate `/home`.

- [ ] **Step 1: Write the failing test** — `frontend/src/pages/OnboardingProfilePage.test.tsx`

```tsx
import { describe, expect, it, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from '../auth/AuthProvider'
import { OnboardingProfilePage } from './OnboardingProfilePage'

function seed(hasProfile: boolean) {
  localStorage.setItem('beaverlink.demo.user', JSON.stringify({ id: 'u-1', name: 'Pat', email: 'p@x.edu', role: 'student', hasProfile }))
  localStorage.setItem('beaverlink.demo.accounts', JSON.stringify([{ email: 'p@x.edu', password: 'secret12', user: { id: 'u-1', name: 'Pat', email: 'p@x.edu', role: 'student', hasProfile } }]))
}

function renderOnboarding() {
  return render(
    <MemoryRouter initialEntries={['/onboarding/profile']}>
      <AuthProvider>
        <Routes>
          <Route path="/onboarding/profile" element={<OnboardingProfilePage />} />
          <Route path="/home" element={<p>home</p>} />
        </Routes>
      </AuthProvider>
    </MemoryRouter>,
  )
}

describe('OnboardingProfilePage', () => {
  beforeEach(() => localStorage.clear())

  it('saves a student profile and lands on home', async () => {
    seed(false)
    const u = userEvent.setup()
    renderOnboarding()
    await u.type(screen.getByLabelText('Major'), 'Computer Science')
    await u.type(screen.getByLabelText('Location'), 'Corvallis, OR')
    await u.click(screen.getByRole('checkbox', { name: 'Find a mentor' }))
    await u.click(screen.getByRole('button', { name: 'Continue to BeaverLink' }))
    expect(await screen.findByText('home')).toBeInTheDocument()
  })

  it('redirects to home if the profile is already done', () => {
    seed(true)
    renderOnboarding()
    expect(screen.getByText('home')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd frontend && npx vitest run src/pages/OnboardingProfilePage.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Create `frontend/src/pages/OnboardingProfilePage.tsx`**

```tsx
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
```

- [ ] **Step 4: Wire routes in `frontend/src/App.tsx`** — import both pages; add the onboarding route (profile not required there) and protect `/profile`:

```tsx
import { OnboardingProfilePage } from './pages/OnboardingProfilePage'
// …
      <Route
        path="/onboarding/profile"
        element={
          <ProtectedRoute requireProfile={false}>
            <OnboardingProfilePage />
          </ProtectedRoute>
        }
      />
// change the existing /profile route to:
      <Route
        path="/profile"
        element={
          <ProtectedRoute>
            <ProfilePage />
          </ProtectedRoute>
        }
      />
```

- [ ] **Step 5: Run test to verify it passes**

Run: `cd frontend && npx vitest run src/pages/OnboardingProfilePage.test.tsx`
Expected: PASS (2 tests).

- [ ] **Step 6: Commit**

```bash
git add frontend/src/pages/OnboardingProfilePage.tsx frontend/src/pages/OnboardingProfilePage.test.tsx frontend/src/App.tsx
git commit -m "feat: add onboarding profile page and protect /profile

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 10: Restyle LoginPage onto AuthCard; add sign-up link; gate demo autofill

**Files:**
- Modify: `frontend/src/pages/LoginPage.tsx`
- Verify: `frontend/src/auth/auth.test.tsx` still passes unchanged

**Interfaces:**
- Consumes: `AuthCard`, `Input`, `Button`, `useAuth().login`, `demoUsers`, `DEMO_PASSWORD`.
- Produces: `LoginPage` on the shared `AuthCard`. Keeps `getByLabelText('Email'|'Password')`, the `Sign in` button, the `Demo accounts` section (gated behind `import.meta.env.DEV`, which is true under Vitest so existing tests pass), and adds a "Create an account" link to `/signup`. After login → `/home` (ProtectedRoute bounces to onboarding if needed).

- [ ] **Step 1: Confirm the baseline is green**

Run: `cd frontend && npx vitest run src/auth/auth.test.tsx`
Expected: PASS (existing suite) — this is the regression guard for the restyle.

- [ ] **Step 2: Replace `frontend/src/pages/LoginPage.tsx`**

```tsx
import { useState } from 'react'
import type { FormEvent } from 'react'
import { useNavigate, Navigate, Link } from 'react-router-dom'
import { AuthCard } from '../components/auth/AuthCard'
import { Input } from '../components/Input'
import { Button } from '../components/Button'
import { useAuth } from '../auth/useAuth'
import { DEMO_PASSWORD, demoUsers } from '../auth/demoUsers'

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function LoginPage() {
  const { user, login, isLoading } = useAuth()
  const navigate = useNavigate()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [emailError, setEmailError] = useState('')
  const [passwordError, setPasswordError] = useState('')
  const [formError, setFormError] = useState('')

  if (user) return <Navigate to="/home" replace />

  function validate(): boolean {
    let ok = true
    if (!EMAIL_PATTERN.test(email.trim())) { setEmailError('Enter a valid email address.'); ok = false } else setEmailError('')
    if (!password) { setPasswordError('Password is required.'); ok = false } else setPasswordError('')
    return ok
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setFormError('')
    if (!validate()) return
    try {
      await login(email, password)
      navigate('/home', { replace: true })
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Unable to sign in.')
    }
  }

  function fillDemo(demoEmail: string) {
    setEmail(demoEmail)
    setPassword(DEMO_PASSWORD)
    setEmailError(''); setPasswordError(''); setFormError('')
  }

  return (
    <AuthCard title="Sign in" subtitle="Welcome back">
      <form className="mt-7 flex flex-col gap-4" noValidate onSubmit={handleSubmit}>
        <Input label="Email" type="email" autoComplete="username" placeholder="you@oregonstate.edu" value={email} onChange={(e) => setEmail(e.target.value)} error={emailError} />
        <Input label="Password" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} error={passwordError} />
        {formError && (
          <p role="alert" className="rounded-xl bg-red-50 px-3.5 py-2.5 text-sm text-red-700 ring-1 ring-inset ring-red-600/15">
            {formError}
          </p>
        )}
        <Button type="submit" disabled={isLoading} className="mt-1 w-full">
          {isLoading ? 'Signing in…' : 'Sign in'}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-stone-500">
        New to BeaverLink?{' '}
        <Link to="/signup" className="font-semibold text-osu hover:underline">Create an account</Link>
      </p>

      {import.meta.env.DEV && (
        <div className="mt-8">
          <div className="flex items-center gap-3">
            <span className="h-px flex-1 bg-stone-200" />
            <span className="text-xs font-semibold uppercase tracking-wide text-stone-400">Demo accounts</span>
            <span className="h-px flex-1 bg-stone-200" />
          </div>
          <p className="mt-3 text-center text-xs text-stone-500">
            Click an account to autofill — password{' '}
            <code className="rounded bg-stone-100 px-1.5 py-0.5 font-mono text-stone-700">{DEMO_PASSWORD}</code>
          </p>
          <ul className="mt-3 flex flex-col gap-2">
            {demoUsers.map((account) => (
              <li key={account.id}>
                <button
                  type="button"
                  onClick={() => fillDemo(account.email)}
                  className="flex w-full items-center gap-3 rounded-xl border border-stone-200 bg-white px-3 py-2.5 text-left hover:border-osu/50 hover:shadow-sm"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-ink">{account.email}</span>
                    <span className="block text-xs text-stone-500">{account.label}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </AuthCard>
  )
}
```

- [ ] **Step 3: Run the auth regression suite + the new suites**

Run: `cd frontend && npx vitest run src/auth/auth.test.tsx src/pages/SignupPage.test.tsx`
Expected: PASS. (`auth.test.tsx` still finds "Demo accounts", Email/Password labels, and the Sign in button.)

- [ ] **Step 4: Commit**

```bash
git add frontend/src/pages/LoginPage.tsx
git commit -m "feat: restyle login onto AuthCard with sign-up link; gate demo autofill

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 11: ProfilePage edit mode reuses ProfileForm

**Files:**
- Modify: `frontend/src/pages/ProfilePage.tsx`
- Modify: `frontend/src/pages/ProfilePage.test.tsx` (update to the new reused form)

**Interfaces:**
- Consumes: `useAuth()` (`user`, `saveProfile`), `ProfileForm`, existing `PROFILES_KEY` data (read current profile), `AppShell` (keep the page inside the shell for signed-in chrome).
- Produces: `/profile` edit page. Loads the saved profile for `user.id` (from `localStorage['beaverlink.demo.profiles']`), renders `ProfileForm` pre-filled, saves on submit with a "Profile saved" status.

- [ ] **Step 1: Write/replace the test** — `frontend/src/pages/ProfilePage.test.tsx`

```tsx
import { describe, expect, it, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { AuthProvider } from '../auth/AuthProvider'
import ProfilePage from './ProfilePage'

function seedStudent() {
  localStorage.setItem('beaverlink.demo.user', JSON.stringify({ id: 'u-1', name: 'Pat', email: 'p@x.edu', role: 'student', hasProfile: true }))
  localStorage.setItem('beaverlink.demo.profiles', JSON.stringify({ 'u-1': { location: 'Corvallis, OR', goals: ['Find a mentor'], studentYear: 'Third year', major: 'CS', source: 'manual' } }))
}

describe('ProfilePage (edit)', () => {
  beforeEach(() => localStorage.clear())

  it('pre-fills the saved profile and saves edits', async () => {
    seedStudent()
    const u = userEvent.setup()
    render(<MemoryRouter><AuthProvider><ProfilePage /></AuthProvider></MemoryRouter>)
    expect(screen.getByLabelText('Location')).toHaveValue('Corvallis, OR')
    await u.clear(screen.getByLabelText('Location'))
    await u.type(screen.getByLabelText('Location'), 'Portland, OR')
    await u.click(screen.getByRole('button', { name: 'Save profile' }))
    expect(await screen.findByText('Profile saved.')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd frontend && npx vitest run src/pages/ProfilePage.test.tsx`
Expected: FAIL — old ProfilePage has its own form / no "Location" label / not wrapped in AuthProvider state.

- [ ] **Step 3: Replace `frontend/src/pages/ProfilePage.tsx`**

```tsx
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd frontend && npx vitest run src/pages/ProfilePage.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/pages/ProfilePage.tsx frontend/src/pages/ProfilePage.test.tsx
git commit -m "refactor: ProfilePage edit mode reuses the shared ProfileForm

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 12: Minimal guest home

**Files:**
- Create: `frontend/src/features/guest/GuestLanding.tsx`
- Modify: `frontend/src/pages/HomePage.tsx` (branch guest)
- Test: `frontend/src/pages/HomePage.guest.test.tsx` (new)

**Interfaces:**
- Consumes: `useAuth()`, `AppShell`.
- Produces: `GuestLanding` — a minimal "You're all set" home (welcome + profile summary + a disabled "Browse attendees" affordance noted as coming soon). `HomePage` routes `role === 'guest'` to it.

- [ ] **Step 1: Write the failing test** — `frontend/src/pages/HomePage.guest.test.tsx`

```tsx
import { describe, expect, it, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { AuthProvider } from '../auth/AuthProvider'
import { HomePage } from './HomePage'

describe('HomePage guest', () => {
  beforeEach(() => localStorage.clear())
  it('shows the guest landing for a guest user', async () => {
    localStorage.setItem('beaverlink.demo.user', JSON.stringify({ id: 'u-9', name: 'Riley Guest', email: 'r@x.com', role: 'guest', hasProfile: true }))
    render(<MemoryRouter><AuthProvider><HomePage /></AuthProvider></MemoryRouter>)
    expect(await screen.findByText(/You're all set/i)).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd frontend && npx vitest run src/pages/HomePage.guest.test.tsx`
Expected: FAIL — guest currently falls through to `AdminLanding`.

- [ ] **Step 3: Create `frontend/src/features/guest/GuestLanding.tsx`**

```tsx
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
```

- [ ] **Step 4: Branch guest in `frontend/src/pages/HomePage.tsx`** — add the lazy import and the role branch:

```tsx
const GuestLanding = lazy(() => import('../features/guest/GuestLanding'))
// …inside HomePage, replace the Page ternary with:
  const Page =
    user.role === 'student'
      ? StudentLanding
      : user.role === 'alumnus'
        ? AlumniLanding
        : user.role === 'guest'
          ? GuestLanding
          : AdminLanding
```

- [ ] **Step 5: Run test to verify it passes**

Run: `cd frontend && npx vitest run src/pages/HomePage.guest.test.tsx`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/features/guest/ frontend/src/pages/HomePage.tsx frontend/src/pages/HomePage.guest.test.tsx
git commit -m "feat: add minimal guest home and route guests to it

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 13: Public landing links + full-suite green + docs

**Files:**
- Modify: `frontend/src/pages/PublicLanding.tsx` (point "Get started" → `/signup`, "Sign in" → `/login`; verify existing links)
- Modify: `docs/requirements.md` (FR-1/FR-2 status), `docs/design.md` (frontend description)
- Test: whole frontend suite + typecheck + build

**Interfaces:**
- Consumes: everything above.
- Produces: a shippable branch with green CI-parity checks and updated product docs (AGENTS.md rule: docs updated in the same PR as behavior).

- [ ] **Step 1: Point the landing CTAs at the new routes** — open `frontend/src/pages/PublicLanding.tsx`; ensure the primary "Get started" CTA links to `/signup` and the secondary "Sign in" to `/login` (use `<Link>` / `useNavigate` consistent with that file's existing pattern). If they already point to `/login`, change the primary CTA to `/signup`.

- [ ] **Step 2: Run the full frontend suite**

Run: `cd frontend && npm run test`
Expected: PASS — all suites (RoleBadge, AuthProvider, ProtectedRoute, AuthCard, SignupPage, ProfileForm, OnboardingProfilePage, auth, ProfilePage, HomePage.guest).

- [ ] **Step 3: Typecheck, lint, build**

Run: `cd frontend && npx tsc -b && npm run lint && npm run build`
Expected: all succeed, no type or lint errors.

- [ ] **Step 4: Update `docs/requirements.md`** — set FR-1 status to *In progress (frontend sign-up/sign-in on mock auth; backend 401 rule pending)* and FR-2 status to *In progress (role-specific form saves to mock store; access checks pending backend)*. Keep wording factual; do not claim backend auth exists.

- [ ] **Step 5: Update `docs/design.md`** — in "What Exists at This Commit", replace the demo-login sentence with: the frontend now has a stepped sign-up (student / alum / guest) that flows into role-specific profile onboarding and a restyled sign-in, all on the mock `AuthProvider` (localStorage), no backend or Supabase client. Note Phase 2 (real auth via FastAPI + Supabase-Postgres) is still deferred per the RFCs.

- [ ] **Step 6: Verify no R5 trip**

Run: `cd frontend && grep -r "@supabase/supabase-js" src || echo "clean"`
Expected: `clean`.

- [ ] **Step 7: Commit**

```bash
git add frontend/src/pages/PublicLanding.tsx docs/requirements.md docs/design.md
git commit -m "docs: update requirements/design for sign-up + onboarding; wire landing CTAs

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Manual verification (before opening the PR)

Run `cd frontend && npm run dev` and, in the browser:

1. `/signup` → step through email → password (try a weak one, confirm the complexity error) → name + each role → land on `/onboarding/profile`.
2. Fill the role-specific form (try adding a photo, add one experience entry and one education entry, then remove one), submit → land on the right `/home` (student/alum dashboard, guest minimal home).
3. Log out → `/login` → sign back in → straight to `/home` (no re-onboarding).
4. Visit `/home` while signed out → `/login`. Visit `/onboarding/profile` after finishing → `/home`.
5. `/profile` → edit a field, add/edit/remove an experience or education entry → "Profile saved."; refresh and confirm the history persisted.

## Self-review notes (coverage)

- Spec "three roles" → Tasks 1, 5, 6, 12. "Photo" → Task 6. "Expanded fields (location/LinkedIn/company/industry/position)" → Task 6. "Wide two-column profile" → Tasks 4 (`wide`) + 6 (grid). "Guest `/home` default" → Task 12. "Stepped sign-up" → Task 5. "Password policy" → Task 5. "Onboarding redirect rule" → Tasks 3, 9. "Demo autofill behind dev flag" → Task 10. "LinkedIn-style experience/education, optional, all roles" → Tasks 1 (types), 7 (ExperienceEditor), 8 (EducationEditor + wiring). "No dedicated logo" → Global + Task 4 (`Logo` placeholder reused). "Docs same PR" → Task 13. "No `@supabase/supabase-js`" → Global + Task 13 Step 6.
- Type consistency: `Profile`/`SignupRole`/`SignupInput`/`AuthContextValue`/`ExperienceEntry`/`EducationEntry` defined in Task 1 and used verbatim in Tasks 2, 5, 6, 7, 8, 9, 11. `saveProfile(profile)`, `signup(input)` signatures consistent across Tasks 2, 5, 9, 11. `emptyProfile()` (Task 6) and the `AuthProvider.test.tsx` `saveProfile` literal (Task 2) both updated to include `experience: []` / `education: []` since those fields are non-optional on `Profile`.
- Backward-compat check: `ProfileForm`'s state init merges `{ ...emptyProfile(), ...initial }` (Task 6) so a saved profile predating the history fields (e.g. Task 11's test fixture, which deliberately omits them) doesn't crash `ExperienceEditor`/`EducationEditor`.
