import { betterAuth } from 'better-auth'
import { jwt } from 'better-auth/plugins'
import { PostgresDialect } from 'kysely'
import { pool } from './db.js'
import { sendPasswordResetEmail } from './email.js'

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
    minPasswordLength: 12,
    maxPasswordLength: 128,
    resetPasswordTokenExpiresIn: 60 * 60,
    revokeSessionsOnPasswordReset: true,
    sendResetPassword: async ({ user, token }) => {
      await sendPasswordResetEmail({
        email: user.email,
        token,
      })
    },
  },

  rateLimit: {
    enabled: true,
    window: 60,
    max: 100,
    customRules: {
      '/request-password-reset': {
        window: 15 * 60,
        max: 5,
      },
      '/reset-password': {
        window: 15 * 60,
        max: 10,
      },
    },
  },

  advanced: {
    ipAddress: {
      ipAddressHeaders: ['x-client-ip'],
    },
  },

  trustedOrigins: [
    frontendURL
  ],

  plugins: [jwt()],
})