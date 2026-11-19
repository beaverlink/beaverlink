# Design: Login, Sign-up, and Profile Onboarding

| Field | Value |
| --- | --- |
| Date | 2026-11-19 |
| Branch | `feat/login-signup` (off `dev`) |
| Status | Proposed — awaiting review |
| Scope | Frontend only, Phase 1 (mock/local auth) |

## Goal

Add a real sign-up flow and a restyled sign-in to the BeaverLink frontend. Sign-up
leads into first-run profile creation, so a new user ends at `/home` with a complete
profile. The UI follows a Google / Microsoft "one-thing-per-step" centered-card style.

This replaces the demo-only login (hardcoded accounts, autofill) as the primary entry,
while keeping the demo accounts available behind a dev flag for the existing dashboards.

## Decisions that shape this (from the docs)

- **Phase 1 is frontend-only and mock.** Auth stays behind the existing provider-agnostic
  `AuthProvider` API; nothing imports `@supabase/supabase-js`. This avoids the **R5** trigger
  (`docs/risks.md`: *"a PR imports `@supabase/supabase-js` in the frontend"*, High impact) and
  does not block on the still-open team decision *"How must alumni sign in?"* (`requirements.md`
  open questions). Real Supabase-backed auth lands later via the FastAPI backend (RFC:
  *Supabase with Better Auth*), with the frontend calling the backend, never the DB directly
  (`design.md`: *"the frontend never queries the database directly"*).
- **Manual entry, team-controlled schema.** The profile step is manual entry with a schema we
  control, matching the recommended **Option D** in the profile-data-sign-in RFC. Each profile
  field carries a `source` tag (`'manual'` for now) so an OSU Connections adapter can fill the
  same shape later with no schema change.
- **Fake data only.** No real names or emails in code or fixtures (**NFR-1 / C-1 / R2**).
- **No OAuth buttons** in Phase 1 (per product decision); "Google/Microsoft style" refers to the
  visual treatment, not third-party sign-in.
- **Docs updated in the same PR** when behavior changes (AGENTS.md): `requirements.md` FR-1/FR-2
  status, `design.md` frontend description.

## User flow

```
/ (PublicLanding)
  ├─ "Get started" → /signup
  └─ "Sign in"     → /login

/signup  (3 steps, stepped card)
  step 1: email  →  step 2: password + confirm  →  step 3: full name + role
  → create account (AuthProvider.signup) → /onboarding/profile

/login
  email + password → submit
  → has complete profile? → /home
  → no profile?           → /onboarding/profile

/onboarding/profile  (protected; reuses the profile form)
  role-specific fields + goals → save → /home

ProtectedRoute: signed in but no profile ⇒ always redirected to /onboarding/profile.
```

## Screen layout (Google / Microsoft style)

Shared `AuthCard`: centered single column, logo at top, large step title, subtle
"Step N of 3" indicator, one primary action, quiet top-left back arrow, secondary link below.
Soft background with the existing campus/Beaver-Orange tint. Horizontal slide between steps;
steps are deep-linkable but guarded (cannot skip ahead with incomplete earlier steps).

```
┌──────────────────────────────┐
│          🔶 BeaverLink        │
│       Create your account     │   step title
│          Step 1 of 3          │   step indicator
│   ┌────────────────────────┐  │
│   │ you@oregonstate.edu    │  │   one focused field
│   └────────────────────────┘  │
│                   [ Next ▸ ]  │   single primary action
│   Already have an account?    │
│              Sign in          │
└──────────────────────────────┘
```

- **Step 1 — email**: format validation; advances locally (no account yet).
- **Step 2 — password**: password + confirm; length/match rules inline.
- **Step 3 — name + role**: full name and role (student / alumnus); **Create account** submits.
  Role chosen here sets `User.role` and **pre-selects** the onboarding profile form's role, which
  then no longer asks for it (the form keeps its role field only for the standalone `/profile`
  edit case). This also reconciles the existing `User.role` value `'alumnus'` with the profile
  form's `'alum'` via a single mapping in one place.
- **Sign in**: single compact card (email + password) in the same visual system, not stepped.

## Data model (frontend)

- `User` gains `hasProfile: boolean` — drives the onboarding redirect.
- `Profile` = the existing `ProfilePage` shape (role, studentYear, graduationYear, major,
  industry, otherIndustry, jobTitle, goals, goalDetails), stored per user id in the
  `AuthProvider`'s mock store (localStorage). Each field is recorded with `source: 'manual'`
  so a future source maps into the same format (RFC Option D swappability).
- Mock persistence only; cleared like the current demo session. Fake data only.

## Components and boundaries

| Unit | Responsibility |
| --- | --- |
| `AuthProvider` | Adds `signup(email, password, name, role)` and a mock profile store; keeps the provider-agnostic surface (`user`, `isLoading`, `login`, `logout`, `signup`, `saveProfile`). |
| `auth/types.ts` | `User.hasProfile`, `Profile`, extended `AuthContextValue`. |
| `ProtectedRoute` | Redirects profile-less users to `/onboarding/profile`. |
| `components/auth/AuthCard`, `StepHeader` | Shared Google/MS-style shell + step title/indicator/back. |
| `components/profile/ProfileForm` | Extracted from `ProfilePage` so it serves both onboarding and `/profile` edits. |
| `pages/SignupPage` | New 3-step stepped card; owns step state and validation. |
| `pages/LoginPage` | Restyled to the shared card; demo autofill behind a dev flag. |
| `pages/OnboardingProfilePage` | Wraps `ProfileForm` for first-run; saves then routes to `/home`. |
| `App.tsx` | Routes `/signup`, `/onboarding/profile`; protect `/profile`. |

## Error handling

- Per-field inline validation (email format, password length/match, required profile fields).
- Signup of an already-registered email surfaces a card-level error, no step advance.
- Login failure reuses the existing "Incorrect email or password" card error.
- `/profile` and `/onboarding/profile` are protected; direct navigation while signed out
  redirects to `/login`.

## Testing

- Vitest + Testing Library, matching existing `auth.test.tsx` / `ProfilePage.test.tsx` style.
- Signup happy path: 3 steps → account created → lands on onboarding.
- Redirect rule: signed-in + no profile → onboarding; with profile → `/home`.
- Validation: each step blocks on bad input; duplicate-email signup errors.
- Profile save sets `hasProfile` and routes to `/home`.
- `tsc`, `eslint`, Vitest, `vite build` all green (CI parity).

## Out of scope (Phase 2, separate PR)

- Real auth via FastAPI + Supabase-Postgres (Better Auth per RFC); backend profile persistence
  and access checks (FR-2's 403 rule); email confirmation; OAuth providers. The `AuthProvider`
  API is designed so only its internals change when this lands.

## Non-goals

- No `@supabase/supabase-js` in the frontend. No real personal data. No OAuth in Phase 1.
```
