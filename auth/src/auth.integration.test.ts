import assert from 'node:assert/strict'
import { after, before, test } from 'node:test'
import type { AddressInfo } from 'node:net'
import type { Server } from 'node:http'

process.env.NODE_ENV = 'test'
process.env.BETTER_AUTH_SECRET = 'ci-only-test-secret-with-at-least-32-chars'
process.env.BETTER_AUTH_URL = 'http://127.0.0.1:3000'
process.env.FRONTEND_URL = 'http://127.0.0.1:5173'
process.env.DATABASE_SSL_MODE = 'disable'
delete process.env.SMTP_HOST
delete process.env.SMTP_PORT
delete process.env.SMTP_FROM

const testDatabaseURL = process.env.DATABASE_URL
if (!testDatabaseURL) {
  throw new Error(
    'DATABASE_URL is required for authentication integration tests',
  )
}

let databaseURL: URL
try {
  databaseURL = new URL(testDatabaseURL)
} catch {
  throw new Error(
    'DATABASE_URL must be a valid PostgreSQL URL',
  )
}

const isLocal = ['localhost', '127.0.0.1'].includes(databaseURL.hostname)
const databaseName = decodeURIComponent(databaseURL.pathname).replace(/^\//, '')
const resetAuthorized = process.env.ALLOW_AUTH_TEST_DB_RESET === 'true'

if (!isLocal) {
  throw new Error(
    'Refusing destructive authentication tests: DATABASE_URL must target localhost or 127.0.0.1',
  )
}
if (databaseName !== 'beaverlink_auth_test') {
  throw new Error(
    'Refusing destructive authentication tests: database name must be exactly beaverlink_auth_test',
  )
}
if (!resetAuthorized) {
  throw new Error(
    'Refusing destructive authentication tests: set ALLOW_AUTH_TEST_DB_RESET=true',
  )
}

const { pool } = await import('./db.js')
// dotenv may load auth/.env; explicitly disable all SMTP delivery for tests.
process.env.SMTP_HOST = ''
process.env.SMTP_PORT = ''
process.env.SMTP_FROM = ''
delete process.env.SMTP_USER
delete process.env.SMTP_PASS

const { runMigrations } = await import('./migrate.js')
let server: Server
let baseURL = ''
const userEmail = 'ci-password-reset@example.test'
const originalPassword = 'original-password'
const newPassword = 'replacement-password'
let signupCookie: string | undefined

function cookieFrom(response: Response): string | undefined {
  return response.headers
    .getSetCookie()
    .map((value) => value.split(';', 1)[0])
    .join('; ')
}

async function post(
  path: string,
  body: unknown,
  cookie?: string,
  clientIP?: string,
) {
  return fetch(`${baseURL}${path}`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      origin: 'http://127.0.0.1:5173',
      ...(cookie ? { cookie } : {}),
      ...(clientIP ? { 'x-client-ip': clientIP } : {}),
    },
    body: JSON.stringify(body),
  })
}

before(async () => {
  await pool.query('drop schema if exists better_auth cascade')
  await runMigrations()
  await runMigrations()

  const { createAuthServer } = await import('./server.js')
  server = createAuthServer()
  await new Promise<void>((resolve) => {
    server.listen(0, '127.0.0.1', resolve)
  })
  const address = server.address() as AddressInfo
  baseURL = `http://127.0.0.1:${address.port}`
})

after(async () => {
  await new Promise<void>((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()))
  })
  await pool.end()
})

test('migrations create tracked Better Auth tables and skip repeated runs', async () => {
  const tables = await pool.query<{ table_name: string }>(`
    select table_name
    from information_schema.tables
    where table_schema = 'better_auth'
  `)
  const names = new Set(tables.rows.map((row) => row.table_name))

  for (const name of ['user', 'session', 'account', 'verification', 'jwks', 'schema_migrations']) {
    assert.equal(names.has(name), true, `missing Better Auth table: ${name}`)
  }

  const tracking = await pool.query<{ filename: string }>(`
    select filename
    from better_auth.schema_migrations
  `)
  assert.equal(tracking.rows.length, 1)
})

test('registers, hashes, persists, and logs in synthetic accounts', async () => {
  const signup = await post('/api/auth/sign-up/email', {
    name: 'CI Test User',
    email: userEmail,
    password: originalPassword,
  })
  assert.equal(signup.ok, true)
  signupCookie = cookieFrom(signup)
  assert.ok(signupCookie)

  const account = await pool.query<{ password: string }>(`
    select password
    from better_auth.account
    where "providerId" = 'credential'
  `)
  assert.equal(account.rows.length, 1)
  assert.notEqual(account.rows[0].password, originalPassword)

  const signin = await post('/api/auth/sign-in/email', {
    email: userEmail,
    password: originalPassword,
  })
  assert.equal(signin.ok, true)
  assert.ok(cookieFrom(signin))

  const sessionCookie = cookieFrom(signin)
  assert.ok(sessionCookie)
  const session = await fetch(`${baseURL}/api/auth/get-session`, {
    headers: {
      origin: 'http://127.0.0.1:5173',
      cookie: sessionCookie,
    },
  })
  assert.equal(session.ok, true)
  const body = await session.json()
  assert.equal(body.user.email, userEmail)
})

test('rejects invalid credentials and signup password length boundaries', async () => {
  const invalid = await post('/api/auth/sign-in/email', {
    email: userEmail,
    password: 'incorrect-password',
  })
  assert.equal(invalid.ok, false)

  const short = await post('/api/auth/sign-up/email', {
    name: 'Short Password',
    email: 'short-password@example.test',
    password: 'short',
  })
  assert.equal(short.ok, false)

  const long = await post('/api/auth/sign-up/email', {
    name: 'Long Password',
    email: 'long-password@example.test',
    password: 'a'.repeat(129),
  })
  assert.equal(long.ok, false)
})

test('logout invalidates the session', async () => {
  const signin = await post('/api/auth/sign-in/email', {
    email: userEmail,
    password: originalPassword,
  })
  const cookie = cookieFrom(signin)
  assert.ok(cookie)

  const logout = await post('/api/auth/sign-out', {}, cookie)
  assert.equal(logout.ok, true)

  const session = await fetch(`${baseURL}/api/auth/get-session`, {
    headers: { origin: 'http://127.0.0.1:5173', cookie },
  })
  const sessionBody = await session.json()
  assert.equal(sessionBody?.session ?? null, null)
})

test('password-reset requests are generic for unknown accounts', async () => {
  const unknown = await post('/api/auth/request-password-reset', {
    email: 'unknown@example.test',
    redirectTo: 'http://127.0.0.1:5173/reset-password',
  })
  assert.equal(unknown.ok, true)
  assert.deepEqual(await unknown.json(), {
    status: true,
    message: 'If this email exists in our system, check your email for the reset link',
  })

  const known = await post('/api/auth/request-password-reset', {
    email: userEmail,
    redirectTo: 'http://127.0.0.1:5173/reset-password',
  })
  assert.equal(known.ok, true)
  assert.deepEqual(await known.json(), {
    status: true,
    message: 'If this email exists in our system, check your email for the reset link',
  })
})

test('rejects invalid, expired, and reused reset tokens', async () => {
  const user = await pool.query<{ id: string }>(
    'select id from better_auth."user" where email = $1',
    [userEmail],
  )
  const userId = user.rows[0].id

  await pool.query(
    `insert into better_auth.verification
      ("id", "identifier", "value", "expiresAt", "createdAt", "updatedAt")
     values ($1, $2, $3, $4, now(), now())`,
    ['expired-verification', 'reset-password:expired-ci-token', userId, new Date(Date.now() - 60_000)],
  )

  const invalid = await post('/api/auth/reset-password', {
    token: 'invalid-ci-token',
    newPassword,
  })
  assert.equal(invalid.ok, false)

  const expired = await post('/api/auth/reset-password', {
    token: 'expired-ci-token',
    newPassword,
  })
  assert.equal(expired.ok, false)
})

test('successfully resets a password once and revokes sessions', async () => {
  const cookie = signupCookie
  assert.ok(cookie)

  await post('/api/auth/request-password-reset', {
    email: userEmail,
    redirectTo: 'http://127.0.0.1:5173/reset-password',
  })

  const verification = await pool.query<{ identifier: string }>(`
    select "identifier"
    from better_auth.verification
    where "identifier" like 'reset-password:%'
    order by "createdAt" desc
    limit 1
  `)
  const token = verification.rows[0].identifier.slice('reset-password:'.length)

  const reset = await post('/api/auth/reset-password', {
    token,
    newPassword,
  })
  if (!reset.ok) {
    assert.fail(`password reset failed: status=${reset.status}, body=${await reset.text()}`)
  }

  const reused = await post('/api/auth/reset-password', {
    token,
    newPassword,
  })
  assert.equal(reused.ok, false)

  const oldLogin = await post('/api/auth/sign-in/email', {
    email: userEmail,
    password: originalPassword,
  })
  assert.equal(oldLogin.ok, false)

  const newLogin = await post('/api/auth/sign-in/email', {
    email: userEmail,
    password: newPassword,
  })
  assert.equal(newLogin.ok, true)

  const oldSession = await fetch(`${baseURL}/api/auth/get-session`, {
    headers: { origin: 'http://127.0.0.1:5173', cookie },
  })
  const oldSessionBody = await oldSession.json()
  assert.equal(oldSessionBody?.session ?? null, null)
})

test('CORS accepts trusted origins and rejects untrusted origins', async () => {
  const trusted = await fetch(`${baseURL}/api/auth/sign-in/email`, {
    method: 'OPTIONS',
    headers: {
      origin: 'http://127.0.0.1:5173',
      'access-control-request-method': 'POST',
    },
  })
  assert.equal(trusted.status, 204)

  const untrusted = await fetch(`${baseURL}/api/auth/sign-in/email`, {
    method: 'OPTIONS',
    headers: {
      origin: 'http://untrusted.example.test',
      'access-control-request-method': 'POST',
    },
  })
  assert.equal(untrusted.status, 403)
})

test('password-reset requests reach 429 after five requests from an isolated IP state', async () => {
  const clientIP = '198.51.100.77'

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const response = await post(
      '/api/auth/request-password-reset',
      {
        email: `isolated-rate-limit-${attempt}@example.test`,
        redirectTo: 'http://127.0.0.1:5173/reset-password',
      },
      undefined,
      clientIP,
    )
    assert.equal(response.status, 200)
  }

  const limited = await post(
    '/api/auth/request-password-reset',
    {
      email: 'isolated-rate-limit-5@example.test',
      redirectTo: 'http://127.0.0.1:5173/reset-password',
    },
    undefined,
    clientIP,
  )
  assert.equal(limited.status, 429)
})
