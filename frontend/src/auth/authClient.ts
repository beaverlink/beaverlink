import { createAuthClient } from 'better-auth/react'

const baseURL =
  import.meta.env.BETTER_AUTH_URL ||
  (import.meta.env.DEV ? 'http://localhost:3000' : undefined)

if (!baseURL) {
  throw new Error('BETTER_AUTH_URL must be configured')
}

export const authClient = createAuthClient({
  baseURL,
  fetchOptions: {
    credentials: 'include',
  },
})