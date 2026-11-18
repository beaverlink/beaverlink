// Roles map to how BeaverLink treats each kind of attendee.
export type Role = 'student' | 'alumnus' | 'admin'

export interface User {
  id: string
  name: string
  email: string
  role: Role | null
}

export interface AuthContextValue {
  user: User | null
  isLoading: boolean
  login: (email: string, password: string) => Promise<void>
  signup: (name: string, email: string, password: string) => Promise<void>
  logout: () => Promise<void>
}
