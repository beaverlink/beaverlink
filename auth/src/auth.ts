import { betterAuth } from 'better-auth'
import { jwt } from 'better-auth/plugins'
import { PostgresDialect } from 'kysely'
import { pool } from './db.js'

const frontendURL = process.env.FRONTEND_URL

if (!frontendURL) {
  throw new Error('FRONTEND_URL is not configured')
}

export const auth = betterAuth({
  database: {
    dialect: new PostgresDialect({ pool }),
    type: 'postgres',
    schemaName: 'better_auth',
  },

  emailAndPassword: {
    enabled: true,
  },

  trustedOrigins: [
    frontendURL
  ],

  plugins: [jwt()],
})