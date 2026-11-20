# Design: Login, Sign-up, and Profile Onboarding

| Field | Value |
| --- | --- |
| Date | 2026-11-19 (design refined 2026-11-20) |
| Branch | `feat/login-signup` (off `dev`) |
| Status | Proposed — awaiting review |
| Scope | Frontend only, Phase 1 (mock/local auth) |
| Mockup | Approved — light, wide, two-column profile (orange/black/brown) |

## Goal

Add a real sign-up flow and a restyled sign-in to the BeaverLink frontend. Sign-up
leads into first-run profile creation, so a new user ends at `/home` with a complete
profile. The UI is a light, warm, Google-style stepped card for sign-up and a wide
two-column profile form for onboarding.

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
- **No OAuth buttons** in Phase 1 (per product decision); the "Google style" is the visual
  treatment, not third-party sign-in. LinkedIn is captured only as a URL the user types — no
  scraping, no Sign-In-with-LinkedIn (keeps clear of **C-7**).
- **Docs updated in the same PR** when behavior changes (AGENTS.md): `requirements.md` FR-1/FR-2
  status, `design.md` frontend description.

## Roles

Self-serve sign-up offers three roles:

- **Student** — current OSU student.
- **Alum** — graduated (`User.role` value `'alumnus'`).
- **Guest** — everyone else (community professionals, recruiters, partners).

`admin` (event organizer) stays a provisioned role, **not** a sign-up option; it remains available
through the dev demo accounts for the existing organizer dashboard.

> **Open item for reviewer:** `HomePage` today renders only student / alumnus / organizer
> dashboards. A guest can sign up and complete a profile but has no dashboard. Phase-1 default:
> route guests to a minimal "You're all set" home (profile summary + browse attendees). A full
> guest dashboard is later work. Confirm or redirect.

## User flow

```
/ (PublicLanding)
  ├─ "Get started" → /signup
  └─ "Sign in"     → /login

/signup  (3 steps, stepped card)
  step 1: email  →  step 2: password + confirm  →  step 3: full name + role (student/alum/guest)
  → create account (AuthProvider.signup) → /onboarding/profile

/login
  email + password → submit
  → has complete profile? → /home
  → no profile?           → /onboarding/profile

/onboarding/profile  (protected; wide two-column profile form, role-specific)
  photo + role-specific fields + goals → save → /home

ProtectedRoute: signed in but no profile ⇒ always redirected to /onboarding/profile.
```

## Screen layout

**Visual system (light mode only).** White cards on a warm-white ground with a soft orange glow;
behind the card, a faint, dimmed OSU campus image (`osu-campus.png`) for a sense of place. Near-black
headings and field text, **Beaver-Orange** (`#d73f09`) for actions / focus / selection, and a warm
**brown** (`#8a5a34`) for uppercase field labels, completed progress segments, and the photo well.
Committed single theme (does not follow OS dark).

There is no dedicated BeaverLink logo yet — all cards reuse the existing `Logo` placeholder (drawn
connection mark + wordmark); no logo image is introduced.

**Sign-up card (narrow, stepped).** Centered single column, logo at top, large step title, a
"Step N of 3" dot indicator, one primary action, quiet top-left back arrow, secondary link below.
Steps are deep-linkable but guarded (cannot skip ahead).

- **Step 1 — email**: format validation; advances locally (no account yet).
- **Step 2 — password**: password + confirm. Policy: 8+ characters with an uppercase letter, a
  lowercase letter, a number, and a special symbol (shown as inline helper text); mismatch and
  weak-password errors inline.
- **Step 3 — name + role**: full name and a three-way role selector. **Create account** submits.
  Role chosen here sets `User.role` and **pre-selects** the onboarding form's role, which then does
  not re-ask it. One mapping reconciles `User.role` `'alumnus'` with the form's `'alum'`.
- **Sign in**: single compact card (email + password), same visual system, not stepped.

**Onboarding card (wide, two-column, short).** A wide card (~790px) with the avatar beside the
heading (not stacked), fields in a two-column grid, and goals two-up, so even the alum's six fields
fit in three short rows instead of a long scroll. Collapses to one column on narrow screens.

## Data model (frontend)

- `Role` = `'student' | 'alumnus' | 'guest' | 'admin'` (admin provisioned only).
- `User` gains `hasProfile: boolean` (drives the onboarding redirect) and optional `avatarUrl`.
- `Profile`, per user id in the `AuthProvider` mock store (localStorage), role-specific:
  - **Common**: `avatarUrl?`, `location`, `linkedinUrl?` (optional), `goals[]`, `goalDetails?`.
  - **Student**: `studentYear`, `major`.
  - **Alum**: `graduationYear`, `industry` (+ `otherIndustry`), `company`, `jobTitle`, `major?`.
  - **Guest**: `company`, `position`, `industry` (+ `otherIndustry`).
  - Each field recorded with `source: 'manual'` (RFC Option D swappability).
- **Avatar** stored as a resized data-URL in localStorage (mock); real image hosting is Phase 2.
- Mock persistence only; cleared like the current demo session. Fake data only.

## Components and boundaries

| Unit | Responsibility |
| --- | --- |
| `AuthProvider` | Adds `signup(email, password, name, role)`, a mock profile store, and `saveProfile`; keeps the provider-agnostic surface (`user`, `isLoading`, `login`, `logout`, `signup`, `saveProfile`). |
| `auth/types.ts` | `Role` (+ `guest`), `User.hasProfile`/`avatarUrl`, role-specific `Profile`, extended `AuthContextValue`. |
| `ProtectedRoute` | Redirects profile-less users to `/onboarding/profile`. |
| `components/auth/AuthCard`, `StepHeader` | Shared light stepped-card shell + step title/indicator/back. |
| `components/profile/ProfileForm` | Extracted from `ProfilePage`; wide two-column, role-specific fields, avatar upload; serves onboarding and `/profile` edits. |
| `components/profile/AvatarUpload` | Photo well: pick → resize → data-URL preview. |
| `pages/SignupPage` | New 3-step stepped card; owns step state and validation; three-role selector. |
| `pages/LoginPage` | Restyled to the shared card; demo autofill behind a dev flag. |
| `pages/OnboardingProfilePage` | Wraps `ProfileForm` for first-run; saves then routes to `/home`. |
| `App.tsx` | Routes `/signup`, `/onboarding/profile`; protect `/profile`. |

## Error handling

- Per-field inline validation (email format, password length/match, required profile fields).
- Signup of an already-registered email surfaces a card-level error, no step advance.
- Login failure reuses the existing "Incorrect email or password" card error.
- Avatar upload rejects non-images / oversized files with an inline message.
- `/profile` and `/onboarding/profile` are protected; direct navigation while signed out
  redirects to `/login`.

## Testing

- Vitest + Testing Library, matching existing `auth.test.tsx` / `ProfilePage.test.tsx` style.
- Signup happy path per role: 3 steps → account created → lands on onboarding → save → `/home`.
- Redirect rule: signed-in + no profile → onboarding; with profile → `/home`.
- Validation: each step blocks on bad input; duplicate-email signup errors.
- Role-specific fields render for student / alum / guest; `hasProfile` set on save.
- `tsc`, `eslint`, Vitest, `vite build` all green (CI parity).

## Out of scope (Phase 2, separate PR)

- Real auth via FastAPI + Supabase-Postgres (Better Auth per RFC); backend profile persistence
  and access checks (FR-2's 403 rule); real avatar hosting; email confirmation; OAuth; full guest
  dashboard. The `AuthProvider` API is designed so only its internals change when this lands.

## Non-goals

- No `@supabase/supabase-js` in the frontend. No real personal data. No OAuth / LinkedIn scraping
  in Phase 1.
```
