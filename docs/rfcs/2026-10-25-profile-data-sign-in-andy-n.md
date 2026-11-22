# RFC: Profile Data Source and Sign-In for BeaverLink

Project 5: BeaverLink

Andy Nguyen <nguyea28@oregonstate.edu>

| Field | Value |
| --- | --- |
| Author | Andy Nguyen |
| Date | 2026-10-25 |
| Status | Accepted |
| Decision Date | 2026-11-08 |
| Deciders | Andy Nguyen, Benjamin Smithynunta, Brady Hanna, Tyler Quach |
| Superseded By | |

## Problem and Context

BeaverLink is a web app for the OSU Alumni Association's networking events. Students and alumni create a profile and fill out a short questionnaire about their goals for an event, and BeaverLink recommends who each person should meet, with a short explanation of why. This decision covers the part of the app everything else builds on: how users get an account, and where their profile data comes from.

The obvious outside source is OSU Connections, the Alumni Association's existing networking site for students and alumni. It's built on Graduway, a platform from the company Gravyty, and Graduway has an API for reading profile data. Our partner didn't require it, but the team explored it so users wouldn't re-enter information they already have. On October 29, Nikki, our Gravyty contact, confirmed by email [4] that:

- The API can look users up by email and return job title, company, industry, job function, education, and mentoring settings.
- A platform admin at the Alumni Association has to enable API access.
- There's only one API key, and it can also update and delete users.
- Graduway's SSO can't sign users into an outside app.
- Storing the data in our own database is still pending with Gravyty's legal team.

The hard-to-reverse part isn't the database schema. A profile table with fields like major, industry, and goals can stay the same no matter where the data comes from. What's expensive to change is identity: whether a BeaverLink user is their own account or a copy of an outside one, and whether BeaverLink owns profile data or depends on another system's data agreements. Once real users have BeaverLink accounts, moving to an outside identity would mean re-linking every account and migrating their data.

This had to be settled now because the team is building on it. Better Auth sign-up (`feat/auth-polish`), the `profiles` table and profile API (`feat/profile-api`), and a 3-step sign-up flow (`feat/login-signup`) are built and in review, and the profile form is merged (PR #24), all ahead of the first deployment planned for fall week 10. If we do nothing and keep standalone accounts with manual profiles, users fill out profiles by hand, and that friction could keep people from signing up before an event.

## Options

### Option A: Import Profiles from the OSU Connections API

BeaverLink keeps its own accounts, but at registration the backend looks users up in OSU Connections by email and imports their profile fields.

**Benefits:** The API returns most of what matching needs, so users would mostly confirm a prefilled profile.

**Costs:** An Alumni Association admin has to enable access, and we don't control when. The only key can also update and delete users, so BeaverLink would hold write access to real alumni accounts. Storage is pending legal review, and email lookup misses anyone who signs up with a different email.

**Right choice if:** The Alumni Association enables access, legal approves storage, and someone outside the student team takes responsibility for the key.

### Option B: OSU Login with BeaverLink Profiles

Users sign in with their OSU (ONID) account and enter their own profile.

**Benefits:** No separate password, and each identity is tied to a real OSU account.

**Costs:** It needs OSU IT approval, and ONID accounts expire after graduation, which would lock out most alumni. It also doesn't solve the profile data problem.

**Right choice if:** BeaverLink were for current students only.

### Option C: Auto-Fill Profiles from Resumes or LinkedIn Exports

Users upload a resume or LinkedIn data export, and BeaverLink extracts fields for them to review.

**Benefits:** No dependency on OSU or Gravyty, and it works for anyone.

**Costs:** Parsing is error-prone, resumes contain more personal information than we need, and not everyone has a current resume.

**Right choice if:** Manual entry turns out to be the main reason people don't finish profiles.

### Option D: Hybrid with Swappable Sources

BeaverLink uses its own accounts, and profiles come from several sources, each tracked per field.

**Benefits:** Development isn't blocked on OSU, and sources can be added later.

**Costs:** Each source needs an adapter and source tracking. Since the schema can stay source-agnostic under any option, this layer only pays off once a second source exists.

**Right choice if:** A second source is likely soon, such as the API being approved.

### Option E: Partner-Provided Event Roster

Before an event, the Alumni Association exports registered attendees who agreed to share their information, and BeaverLink imports it to seed profiles.

**Benefits:** It could test matching at a real event before self-serve sign-up is ready.

**Costs:** It's real personal data, so it needs partner authorization and a data-handling policy first. It repeats for every event, an Eventbrite registration list only has the fields the registration form asks for, and an export taken before the event misses anyone who registers the day of or at the door, including guests alumni bring along [10].

**Right choice if:** The partner wants a pilot event and can provide a consented export.

### Option F: Do Nothing (Standalone Accounts and Manual Profiles), the team's choice

Users create a BeaverLink account and fill out their profile and event questionnaire by hand. Event registration happens on Eventbrite, and the confirmation would link to BeaverLink [9], so people can finish their profile before the event.

**Benefits:** It's the simplest to build and depends on no one outside the team.

**Costs:** Typing a profile takes time, so some people may skip it, and BeaverLink duplicates data the Alumni Association already has.

**Right choice if:** Outside access is uncertain or risky, and the profile form is short enough that people finish it before the event.

## Analysis

**Who controls access.** The biggest difference between options is who has to say yes. Option A needs an Alumni Association admin and Gravyty's legal team. Option B needs OSU IT, and [ONID accounts](https://oregonstate.teamdynamix.com/TDClient/KB/ArticleDet?ID=51559) stay active only a year after graduation. Option E needs partner authorization for every event. Options C and F depend on no one. Even under A, BeaverLink accounts stay separate, since Nikki confirmed there's no way to connect an existing OSU Connections account.

**Schema and maintainability.** The schema doesn't need to depend on where profile data comes from, and our code shows this. The first version of the `profiles` table (`backend/migrations/001_profiles.up.sql` on `feat/profile-api`) stores general fields like profile type, major, industry, job title, and goals, with nothing tied to an outside system. The table will keep changing regardless: Tyler's `feat/login-signup` branch already adds a guest role, since alumni sometimes bring guests [10], plus education and experience fields. Since `backend/app/migrate.py` applies and rolls back each migration in one transaction, changes like these, or a `source` column if a second source arrives, are cheap and reversible. Identity is the expensive part to change, and under F it stays in-house: Better Auth stores accounts in our own Postgres schema (`auth/src/auth.ts` on `feat/auth-polish`).

**Security.** Option A has the biggest security cost. The [Graduway API documentation](https://apidoc.graduway.com/) shows one key covering search, update, and delete, and Nikki confirmed there's no read-only version. If a student project leaked that key, someone could edit or delete real alumni profiles. Under F, BeaverLink stores only what users type in, Better Auth handles password hashing, and Brady's stronger password rules and recovery are in review. The profile API rejects requests without a login (`backend/tests/test_profiles.py`). Option C collects more than we need, like phone numbers and addresses.

**Performance and cost.** None of these options is expensive to run. Gravyty charges nothing extra, and one email lookup per sign-up is trivial at event scale. The real cost is team time: F is mostly built (PR #24 and the profile API), while A would add an adapter, key handling, and a consent step.

**Data quality and user effort.** A gives the richest starting profile. F relies on users filling out the form, which is its main weakness. Linking from Eventbrite registration reduces that risk by giving people days to finish. How long the form takes is still open while its fields change.

**Uncertainty.** We don't know yet whether most attendees will finish a profile before an event, whether the Alumni Association would enable the API later, or what Gravyty's legal team will say about storage. The first unknown decides whether F works, so the verification plan focuses on it.

## Recommendation and Verification Plan

I recommend **Option F: standalone BeaverLink accounts with profiles entered by users**, which is what the team chose. It's the only option that doesn't depend on OSU, Gravyty, or a per-event export, it keeps identity in our own database, and it avoids holding a key that can edit real alumni accounts. Users sign in with email and password through Better Auth [5], which can add Google or LinkedIn sign-in later without moving accounts.

The targets below are starting points the team set in `docs/requirements.md`, to revise after the first results.

**How we'll know it worked:**

1. **Profiles stay private to their owner.** CI runs `backend/tests/test_profiles.py` on every PR. It checks that requests without a login get `401`, and `test_users_only_see_their_own_profile` checks that a second user can't see the first user's profile. They use a stand-in login, so we'll rerun them once FastAPI verifies real Better Auth tokens. *Fails if* any endpoint returns another user's data.
2. **Schema changes are reversible.** `backend/tests/test_migrations.py` rolls back `001_profiles`, confirms the table is gone, and reapplies it, in CI against Postgres. Every new migration gets the same check. *Fails if* a migration can't be rolled back cleanly.
3. **People finish profiles before events.** At the first pilot event, we compare Eventbrite registrations against completed profiles and event surveys. *Target:* 60% of registered attendees finish before the event (Success Metrics). *If it falls short,* we shorten the survey and cut optional fields, then revisit prefilling through Option C or A.
4. **Signup is fast enough.** At least 5 students and alumni outside the team sign up and complete their profile and an event survey while we time them. *Target:* most finish in under 5 minutes (NFR-4). *If it's slower,* we shorten the form before the pilot.
5. **Matches are actually useful.** In a simulated event with at least 8 participants, each person enters their real goals and rates their top 3 recommendations as fitting or not, alongside 3 randomly picked people shown without labels. *Target:* most participants rate at least 2 of 3 recommendations as fitting, and rate them higher than the random picks. *If matches aren't better than random,* we check whether missing profile fields are the cause, which would be evidence to reconsider a richer data source.

**Triggers to revisit:** If check 3 misses at two events, the team reopens prefill options. If the Alumni Association enables the API, legal approves storage, and someone outside the student team manages the key, an import can be added as a new source with one migration.

## Constraints

**Data use (FERPA and partner terms).** Student data tied to OSU may fall under FERPA, and the partner hasn't given data-use terms yet (`docs/requirements.md` C-1, `docs/risks.md` R2). This rules out Option E until the partner authorizes a consented export, and it puts a condition on F: development and CI use fake seed data only (NFR-1), and checks 3 and 5 can't run with real users until terms are in place.

**Third-party terms.** Gravyty hasn't approved storing OSU Connections data, and the only key can edit and delete real accounts, so Option A is out unless legal approves storage and the partner holds the key. LinkedIn prohibits scraping (C-7), so Option C could only use exports users upload themselves.

**Personal data sent to another service.** Better Auth sends password-reset emails through an SMTP provider (`auth/src/email.ts` on `feat/auth-polish`), so user emails go to that provider. Under F, it has to be registered to the partner's account like the hosting (C-5), and reset links must never be logged, which the code already avoids.

**Licensing.** The auth service uses Better Auth, Kysely, pg (MIT), and nodemailer (MIT-0). The backend uses FastAPI and Pydantic (MIT) and psycopg (LGPL-3.0), which only adds obligations if we modify psycopg itself. None of these rule out an option.

**Confidentiality.** There's no NDA, but our Team Charter keeps real student data and credentials, including any Graduway key, out of AI tools and version control (C-4).

## Delegation and Validation

- **What I handed to AI tools.** I used Claude to help draft and revise this RFC from my own material: Nikki's replies, our meeting notes (shared with the team's approval), the peer reviews, and our repository. Claude also helped draft my follow-up emails to Nikki, read the repo for evidence, looked up dependency licenses, and summarized the Graduway API docs. I used Claude Code to help write the profile form, profile API, and `profiles` migration, and reviewed the diffs before opening each PR. I chose the recommendation and approved each section.

- **What checks made that reasonable.** Every claim links to its source, two peer reviews and an instructor review read the draft, and the charter requires unanimous approval for decisions involving authentication and personal data. CI runs `ruff` and `pytest` against Postgres 17, plus `tsc`, ESLint, Vitest, and `vite build`, on every PR to `dev` and `main` (`.github/workflows/ci.yml`), and merging requires one approval and passing CI (`CONTRIBUTING.md`).

- **Where I validated the result myself.**
  - **The API's fields, because a wrong answer would have changed the recommendation.** The public docs only show basic fields for `GET /users`, so I asked Nikki directly, and her corrected answer is what this RFC uses.
  - **Alumni sign-in, because identity is the hardest part to change.** I checked the OSU Connections signup page [3] myself and confirmed it accepts any email, LinkedIn, or Google, and I read OSU's ONID policy.
  - **The schema, because a bad migration is hard to undo once real data exists.** I reviewed the `profiles` migration and ran the backend tests locally, including the migration rollback test and `test_users_only_see_their_own_profile`. All passed.

## Decision

**Accepted on 2026-11-08: Option F.** The team agreed unanimously, as our charter requires for authentication and personal data, and I chaired the decision. BeaverLink uses its own accounts through Better Auth and profiles users enter themselves, and the Graduway API is not used for now. Follow-up work: merge the auth, profile API, and sign-up branches, link BeaverLink from Eventbrite registration, and update `docs/design.md`, `docs/requirements.md`, and `docs/risks.md` to match.

## References

1. Gravyty. *Graduway Open API documentation.* https://apidoc.graduway.com/
2. Oregon State University. *ONID: Account Eligibility and Duration.* https://oregonstate.teamdynamix.com/TDClient/KB/ArticleDet?ID=51559
3. OSU Connections. *Registration page.* https://osuconnections.org/account/registration
4. Nikki (Gravyty). Email replies to the BeaverLink team, thread "Re: OSU Connections," October 22 and October 29, 2026 (not public).
5. Better Auth. *Documentation.* https://www.better-auth.com/docs
6. PyPI. *psycopg* (license: LGPL-3.0). https://pypi.org/project/psycopg/
7. npm. *nodemailer* (license: MIT-0). https://www.npmjs.com/package/nodemailer
8. BeaverLink repository. https://github.com/beaverlink/beaverlink (PR #24; branches `feat/profile-api`, `feat/auth-polish`, `feat/login-signup`; `docs/requirements.md`, `docs/risks.md`, `.github/workflows/ci.yml`)
9. BeaverLink team. Partner meeting notes, Meeting 2, October 2026 (team Google Drive, not public).
10. Karla Rockhold (OSU Alumni Association). Partner meeting discussion on who attends events, including day-of registrations and guests of alumni, fall 2026 (not public).