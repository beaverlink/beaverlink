# RFC: Supabase as Hosted Postgres, Better Auth for Login

| Field | Value |
| --- | --- |
| Author | Benjamin Smithynunta |
| Date | 2026-10-25 (final draft 2026-11-22) |
| Status | Accepted |
| Decision Date | 2026-11-18 |
| Deciders | BeaverLink team |
| Superseded By | (N/A) |

## Problem and Context

BeaverLink is a web app for the OSU Alumni Association that recommends which OSU students and alumni should meet at networking events. Users fill out a profile and survey, and a Python matching engine ranks who to meet. Our tech stack doc listed Supabase for the database, authentication, and realtime, while hosting and alumni sign-in were still open. In review, Andy Nguyen asked that the database choice stay pending until hosting was confirmed. I flagged that putting both Postgres and auth on Supabase makes a later move harder. That cost lands on our project partner and on future teams who maintain BeaverLink after handoff, not on us.

The hard-to-reverse part is where user accounts live. Plain Postgres tables move to any Postgres host with `pg_dump` and restore. Supabase Auth is different. It keeps users in its own `auth` schema, its row-level security (RLS) rules call `auth.uid()`, and its tutorials have the browser query the database directly. Once our tables and screens are built on those three things, leaving Supabase means rewriting all of them and importing every user.

A move is likely, not hypothetical. BeaverLink is handed to the Alumni Association after the project, the free Supabase accounts are being registered to a partner email that has not arrived yet (issue #9), and the OSU Foundation is still asking what data we store and who owns the accounts after handoff. Any of those can end with "move it to an OSU-approved host."

This mattered in sprint 2, which wrote the first schema and the first login screen. Teammates and coding agents copy whatever those first PRs do, because our AGENTS.md tells agents to "match existing code convention." Doing nothing meant sprint 2 starting without a login, with each person or agent following Supabase's tutorial default.

## Options

### Option A: Supabase All-In

Use Supabase for Postgres, auth, and realtime with its default patterns. The React frontend calls `supabase-js` for data and login, and RLS rules using `auth.uid()` decide who can see what.

**Benefits:** fastest path to working login and CRUD screens, and the least backend code.
**Costs:** authorization is split between SQL rules and Python, and leaving means rewriting rules, frontend queries, and user records.
**Right choice when:** the partner confirms BeaverLink stays on Supabase long-term and someone on their side owns the account after handoff.

### Option B: Supabase Auth Behind a Wall

Keep Supabase Auth, but the frontend uses `supabase-js` only to sign in and out. All data goes through FastAPI, which checks the Supabase login token in one module. App tables point at our own `users` table, not `auth.users`.

**Benefits:** ready-made auth, and app code does not depend on Supabase.
**Costs:** accounts still live in Supabase's `auth` schema, so leaving means exporting password hashes, importing them elsewhere, and remapping user IDs.
**Right choice when:** the partner will own the Supabase account but wants the app code portable.

### Option C: Supabase Postgres and Better Auth

Use Supabase only as hosted Postgres, through a standard connection string, with the Data API turned off. Login runs on [Better Auth](https://www.better-auth.com/docs/introduction), an MIT-licensed TypeScript auth library that stores users in our own database. Because our backend is FastAPI, Better Auth runs as a small Node service, and FastAPI checks its tokens with the public key Better Auth publishes. All data goes through FastAPI.

**Benefits:** accounts are ordinary tables in our database, so they move with `pg_dump`. We do not write password code.
**Costs:** one extra service to run and host, and more FastAPI code than Option A.
**Right choice when:** hosting and sign-in may change and we want accounts to move with the database.

### Option D: Auth Inside FastAPI

Skip a second auth system. FastAPI handles login with a Python OAuth/OIDC library such as Authlib, and stores users and sessions in our own Postgres tables.

**Benefits:** one backend service, one language, and accounts move with the database, like Option C.
**Costs:** we write and maintain password hashing, sessions, resets, and rate limiting ourselves, the work Option C avoids. Python libraries cover OAuth flows, not the full email-and-password account lifecycle.
**Right choice when:** sign-in is only through an external identity provider (for example OSU or Google OIDC), so we never store passwords.

### Option E: Do Nothing

Leave the platform "pending" and start sprint 2 on local Postgres in Docker.

**Benefits:** no commitment until the partner answers our hosting questions.
**Costs:** login cannot be built or tested in sprint 2, so the first end-to-end prototype slips. People and agents pick their own auth patterns meanwhile, and the decision arrives in sprint 3 with more code to change.
**Right choice when:** the partner will answer hosting and sign-in questions within a week.

## Analysis

**Reversal cost.** Supabase stores accounts in `auth.users` with bcrypt hashes, and auth providers document importing those hashes so users keep their passwords ([WorkOS migration guide](https://workos.com/docs/migrate/supabase)). The harder part is everything pointing at Supabase's auth model. Neon's guide for leaving Supabase says every `auth.uid()` in a rule must be replaced, user IDs may change so every `user_id` column needs remapping, and the Supabase client must be replaced ([Neon guide](https://neon.com/guides/complete-supabase-migration)). Option A pays all of that. Option B pays the user import and ID remap. Options C and D pay none of it. Better Auth keeps users in four tables in our own database (`user`, `session`, `account`, `verification`) ([Better Auth database docs](https://www.better-auth.com/docs/concepts/database)); our implementation puts them in a separate `better_auth` schema (`auth/src/auth.ts`, PR #42).

**Security.** Supabase warns that an exposed table without RLS "is readable and writable by any role with a grant on it," and that `auth.uid()` returns null for signed-out users, so a wrong rule can fail silently ([Supabase RLS docs](https://supabase.com/docs/guides/database/postgres/row-level-security)). In Option A, coding agents would write many of these rules. Options B, C, and D keep authorization in Python, where pytest covers it and reviewers can read it. In Option C nothing uses Supabase's REST or GraphQL endpoints, so the Data API can be switched off; Supabase's own hardening guide says to do this when an app "never uses Supabase client libraries, REST, or GraphQL data endpoints" ([Supabase hardening guide](https://supabase.com/docs/guides/database/hardening-data-api)). That closes the path an attacker would use to read the `session` table. Option D's main risk is ours: hand-written password and reset code is where student auth bugs live.

**Complexity and performance.** Option A is fastest to a first demo. Options B, C, and D add FastAPI endpoints, which we planned anyway for business logic and matching. Option C also adds the Node service. Better Auth's JWT plugin issues tokens "verifiable with JWKS" for external services ([JWT plugin docs](https://www.better-auth.com/docs/plugins/jwt)), so FastAPI caches the public key and checks tokens locally instead of calling the Node service on every request. The extra hop is at sign-in and token refresh only. I have not measured that cost yet; check 1 below does, before more endpoints depend on it.

**Hosting and cost.** We chose Vercel (issue #10). FastAPI runs there as Python Vercel Functions ([Vercel FastAPI docs](https://vercel.com/docs/frameworks/backend/fastapi)), and functions have a 250 MB bundle limit ([Vercel limits](https://vercel.com/docs/functions/limitations)), which a small Node auth service fits. Supabase's free plan includes a 500 MB database, but free projects pause after a week of inactivity and get no automatic backups; Pro is $25 a month ([Supabase pricing](https://supabase.com/pricing)). Profile and survey data should fit in 500 MB, but that is an estimate without partner user counts.

**Sign-in.** Students have OSU accounts; ONID accounts are deleted a year after graduation (risk R4, issue #11), so alumni need another path. Better Auth's Generic OAuth plugin supports "any OAuth 2.0 or OpenID Connect (OIDC) provider" ([Generic OAuth docs](https://www.better-auth.com/docs/plugins/generic-oauth)), so OSU or Google sign-in can be added without moving users. That is also why Option D loses: alumni need email and password, so we would store passwords ourselves.

**Uncertainty.** I do not know whether OSU will require OSU hosting or whether the Alumni Association allows this data with a third-party vendor. Option C loses the least if either changes. The Node service's latency and Vercel cold starts are untested.

## Recommendation and Verification Plan

I recommend Option C, Supabase as hosted Postgres with Better Auth for login and the Data API off. It is the only option where accounts move with the database without us writing password code. It also follows Andy's point: we commit to Postgres and treat Supabase as a replaceable host, which spares the partner and future teams from auth lock-in.

**How we will know it worked:**

1. **Spike: Better Auth beside FastAPI (by 2026-12-06).** Run the Node service from PR #42 next to FastAPI on staging. Sign in, have FastAPI verify the token through `/api/auth/jwks`, then `pg_dump`, restore into plain Postgres, and sign in again. Acceptance: FastAPI verifies tokens with a cached key and adds under 5 ms per request; sign-in returns within 1 second at p95 over 50 attempts; the restored login works. If this fails by the date, fall back to Option B and record why in this RFC.
2. **Portability test in CI (every PR).** CI starts a plain Postgres container. Add a step that applies all migrations, including `auth/migrations/`, before tests run. Anything needing a Supabase-only feature fails this job. Acceptance: green on every merged PR.
3. **No Supabase client in the frontend (every PR).** An ESLint rule in `npm run lint` fails if frontend code imports `@supabase/supabase-js`, and AGENTS.md states the rule. Acceptance: zero violations.
4. **Authorization tests (sprint 2).** Pytest checks that FastAPI rejects requests with no token, an expired token, or a token not signed by the Better Auth key, and that a user cannot read or edit another user's profile or survey. Acceptance: tests exist for every endpoint touching user data.
5. **Data API off (before real data).** A script calls Supabase's REST URL with the project's public key for every table, including `better_auth.user` and `better_auth.session`. Acceptance: every request is refused, and the dashboard shows the Data API disabled.
6. **Exit rehearsal (before handoff).** Dump the Supabase dev database with seed users, restore into plain Postgres, point Better Auth and FastAPI at it, and log in. Acceptance: a written runbook, matching row counts in every `better_auth` table, and one successful login.

## Constraints

**Licensing.** Supabase is Apache 2.0, Better Auth is MIT ([GitHub](https://github.com/better-auth/better-auth)), and PostgreSQL uses the PostgreSQL License, so none places obligations on our code. The hosted Supabase service has its own terms of service, so the partner must own or accept that account at handoff; this is why accounts are registered to a partner email (issue #9).

**Data use.** Profiles and surveys hold personal data about students and alumni, and Supabase makes a third party hold it. We told the OSU Foundation we store self-reported public information (name, email, major, LinkedIn, job title, industry) and are waiting on their answer. Until then, only seed data goes in. The free plan has no backups, so before real data arrives we either pay for Pro or schedule our own `pg_dump` backups. Turning off the Data API is a condition on the recommendation, because it limits who can read stored personal data.

**IP.** The schema, FastAPI code, and matching engine are handed off under the partner agreement. With Option C, accounts are part of that database, so the partner gets a working system even if they never take over the Supabase account.

**Confidentiality.** BeaverLink is not under an NDA. This RFC used only public documentation, our repository, the tech stack doc, and my own review notes.

## Delegation and Validation

- **What I handed to AI tools.** For the draft, I used Claude to read the course RFC template, our repository (CI workflow, AGENTS.md, CONTRIBUTING.md), and the tech stack doc, to look up Supabase and Better Auth documentation and two migration guides, and to draft the document from my review comments. The core concern, Supabase for Postgres only with a separate auth library, came from my own review comment before I used AI. For this final draft, I used Claude Code to collect feedback items, read the auth code in PRs #42 to #45, check the new Supabase and Vercel citations, and revise the text.

- **What checks made that reasonable.** This is research and writing, so the checks are mostly human. Every factual claim links to its source, the RFC got two peer reviews, a design review, and instructor comments, and the team's implementation goes through review. CI runs on every PR to `dev` and `main`: `ruff` and `pytest` against Postgres for the backend, and `tsc`, lint, tests, and build for the frontend. PR #45 adds an auth integration test job against Postgres. CONTRIBUTING.md bans direct pushes to `dev` and `main`, needs one approval and passing CI to merge, and asks each PR to say the author tested agent-written code. Branch protection was tested in PR #2. Checks 1, 2, 3, 5, and 6 above do not exist yet.

- **Where I stopped and validated the result myself.** Because this decision is hard to reverse, I opened each cited page and confirmed the figures (500 MB, one-week pause, $25 Pro, bcrypt hashes, the `auth.uid()` rewrite, Better Auth's four tables and MIT license, the Data API guidance). I checked that Brady's implementation in PR #42 uses the JWT plugin and a separate `better_auth` schema, because the reversal argument depends on accounts living in our own tables. I chose the recommendation myself, based on what I can defend without the tool.

## Decision

Accepted. The team acted on Option C: Supabase was set up as hosted Postgres in PR #21 (merged), and the Better Auth service and frontend login are in review in PRs #42, #43, and #45, opened 2026-11-18. The Data API has not been turned off yet; check 5 tracks it. If the partner requires OSU hosting or OSU sign-in, this RFC is revisited and checks 1 to 6 show what has to move.

## References

1. Better Auth. Introduction. https://www.better-auth.com/docs/introduction
2. Better Auth. Database. https://www.better-auth.com/docs/concepts/database
3. Better Auth. JWT plugin. https://www.better-auth.com/docs/plugins/jwt
4. Better Auth. Generic OAuth plugin. https://www.better-auth.com/docs/plugins/generic-oauth
5. Better Auth. Source repository and license. https://github.com/better-auth/better-auth
6. Supabase. Row Level Security. https://supabase.com/docs/guides/database/postgres/row-level-security
7. Supabase. Hardening the Data API. https://supabase.com/docs/guides/database/hardening-data-api
8. Supabase. Pricing. https://supabase.com/pricing
9. WorkOS. Migrate from Supabase. https://workos.com/docs/migrate/supabase
10. Neon. Complete Supabase migration guide. https://neon.com/guides/complete-supabase-migration
11. Vercel. FastAPI on Vercel. https://vercel.com/docs/frameworks/backend/fastapi
12. Vercel. Functions limitations. https://vercel.com/docs/functions/limitations
13. BeaverLink repository: issues #9, #10, #11, #32; PRs #2, #21, #42, #43, #45; `auth/src/auth.ts`; `.github/workflows/ci.yml`; AGENTS.md; CONTRIBUTING.md. https://github.com/beaverlink/beaverlink
