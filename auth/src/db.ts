import 'dotenv/config'
import { Pool } from 'pg'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const connectionString = process.env.DATABASE_URL

if (!connectionString) {
  throw new Error('DATABASE_URL is not configured')
}

// Configure SSL independently of the database provider
const sslMode = process.env.DATABASE_SSL_MODE ?? 'verify'
const caPath = process.env.DATABASE_CA_CERT_PATH

// Prevent connection-string options from overriding SSL configuration
const databaseUrl = new URL(connectionString)

for (const param of ['sslmode', 'sslcert', 'sslkey', 'sslrootcert']) {
  if (databaseUrl.searchParams.has(param)) {
    throw new Error(
      `Remove ${param} from DATABASE_URL; configure SSL using environment variables`
    )
  }
}

// Resolve certificate paths relative to the auth directory
const authRoot = fileURLToPath(new URL('../', import.meta.url))

let ssl: false | {
  rejectUnauthorized: true
  ca?: string
}

if (sslMode === 'disable') {
  ssl = false
} else if (sslMode === 'verify') {
  ssl = {
    rejectUnauthorized: true,
    ...(caPath
      ? { ca: readFileSync(resolve(authRoot, caPath), 'utf8') }
      : {}),
  }
} else {
  throw new Error(
    'DATABASE_SSL_MODE must be "verify" or "disable"'
  )
}

export const pool = new Pool({
  connectionString,
  connectionTimeoutMillis: 5000,
  ssl,
})