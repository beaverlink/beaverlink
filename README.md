# BeaverLink

BeaverLink recommends who OSU students and alumni should meet at OSU Alumni Association networking events, and explains why each match makes sense.

Status: backend scaffold (`GET /health`) plus a front-end-only demo login (no real authentication yet). See [docs/requirements.md](docs/requirements.md) and [docs/design.md](docs/design.md).

## Quickstart

Needs Git and Python 3.10 or newer.

```bash
git clone https://github.com/Splash791/beaverlink.git
cd beaverlink/backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

Run the tests and lint (the same checks CI runs):

```bash
pytest
ruff check .
ruff format --check .
```

Start the API:

```bash
uvicorn app.main:app --reload
```

Then open http://127.0.0.1:8000/health. It should show `{"status":"ok"}`.

## Frontend authentication

Copy [frontend/.env.example](frontend/.env.example) to `frontend/.env.local` and keep the default local auth URL:

```dotenv
VITE_BETTER_AUTH_URL=http://localhost:3000
```

In separate terminals, start the auth service and frontend:

```bash
cd auth
npm install
npm run dev
```

```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:5173. Use the auth service's real signup and login forms; do not use real personal data during development.

Passwords must contain 12 to 128 characters. BeaverLink validates this in the frontend and Better Auth service; it does not require uppercase letters, numbers, or symbols.

### Password reset email testing

Password reset emails use a provider-independent SMTP adapter. For local
testing, run [Mailpit](https://github.com/axllent/mailpit), then configure
`auth/.env` with:

```dotenv
SMTP_HOST=127.0.0.1
SMTP_PORT=1025
SMTP_SECURE=false
SMTP_FROM=BeaverLink <noreply@example.local>
```

If `SMTP_HOST`, `SMTP_PORT`, and `SMTP_FROM` are absent, the auth service does
not attempt delivery and explicitly reports a local warning. It never logs
reset tokens or reset links. In production, configure the SMTP variables for a
provider-approved SMTP service (for example, Mailgun, Postmark, or SendGrid).
Do not add provider API keys or credentials to the repository or frontend
build.

## Local database

Needs Docker and Node.js. From the repo root:

```bash
npx supabase start
```

This runs PostgreSQL 17 in Docker at `postgresql://postgres:postgres@127.0.0.1:54322/postgres`. Stop it with `npx supabase stop`.

## Frontend

A Vite + React + TypeScript demo of the BeaverLink experience, using hardcoded
mock data only (no backend, API, Supabase, or env vars). Needs Node 22 or newer.

```bash
cd frontend
npm install
npm run dev
```

Then open the printed URL (default http://localhost:5173).

The landing page (`/`) is a public marketing page; **Get started / Sign in**
lead to the login. After signing in, `/home` shows a role-specific dashboard:

- **Student** — next-event countdown, ranked alumni matches with a score ring
  and a factor-by-factor "why this match" breakdown, working filters/sort, a
  survey-completeness meter, events with live check-in, and saved connections
  with a templated intro helper.
- **Alumnus** — ranked students who'd benefit from meeting them, availability
  controls (open-to-connect, topics, conversation format), an impact summary
  with a hand-built chart, event RSVPs with a live attendee count, and a
  profile preview.
- **Organizer (admin)** — an event dashboard with a live check-in panel,
  matching-health funnel and distribution, and a sortable/filterable attendee
  table with a detail drawer and mock quick actions (including a real CSV
  export).

Demo accounts (password `demo1234` for all):

- `student@oregonstate.edu` — student
- `alumni@oregonstate.edu` — alumnus
- `organizer@oregonstate.edu` — event organizer (admin)

Checks (the same ones CI runs):

```bash
npx tsc --noEmit
npm run lint
npm test
npm run build
```

The Vitest suite uses mocks for the Better Auth browser client and real React
component behavior. It verifies signup, login, logout, protected routes,
password validation, and password recovery UI. Component fixtures use synthetic
accounts and fake event/profile data only.

## Authentication service tests

The auth service test suite requires PostgreSQL. A plain PostgreSQL 17 database
can be provided locally with Docker, Podman, or another PostgreSQL host:

```bash
cd auth
npm ci
DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:5432/beaverlink_auth_test \
DATABASE_SSL_MODE=disable \
BETTER_AUTH_SECRET=local-test-secret-with-at-least-32-characters \
BETTER_AUTH_URL=http://127.0.0.1:3000 \
FRONTEND_URL=http://127.0.0.1:5173 \
npm test
npm run typecheck
npm run build
```

The integration suite uses synthetic users, real migration SQL, real Better
Auth HTTP endpoints, and plain PostgreSQL. No real SMTP server or live email
is required. Email sending is isolated by leaving SMTP variables unset.

GitHub Actions creates a temporary `postgres:17-alpine` service container,
waits for it to become healthy, sets `DATABASE_SSL_MODE=disable`, runs migration
tests twice, and executes the Better Auth integration suite. CI never connects
to Supabase or uses hosted credentials.

## Docs

- [Requirements](docs/requirements.md)
- [Design](docs/design.md)
- [Risks](docs/risks.md)
- [Contributing](CONTRIBUTING.md)
