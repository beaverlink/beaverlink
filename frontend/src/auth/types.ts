// Roles map to how BeaverLink treats each kind of attendee.
export type Role = 'student' | 'alumnus' | 'guest' | 'admin'

// Roles a visitor can pick during self-serve sign-up (admin is provisioned).
export type SignupRole = 'student' | 'alumnus' | 'guest'

export interface User {
  id: string
  name: string
  email: string
  role: Role
  hasProfile: boolean
  avatarUrl?: string
}

// One flat, role-aware shape. Only the fields for a user's role are filled in.
export interface Profile {
  // common
  location: string
  linkedinUrl?: string
  goals: string[]
  goalDetails?: string
  avatarUrl?: string
  // student
  studentYear?: string
  major?: string
  // alum
  graduationYear?: string
  industry?: string
  otherIndustry?: string
  company?: string
  jobTitle?: string
  // guest
  position?: string
  // LinkedIn-style history, all roles, optional (Task 7/8)
  experience: ExperienceEntry[]
  education: EducationEntry[]
  // which source filled this profile (RFC Option D swappability)
  source: 'manual'
}

// A single work-experience entry (LinkedIn-style). `current: true` means the
// person still works there and `endDate` is unused.
export interface ExperienceEntry {
  id: string
  title: string
  company: string
  location?: string
  startDate: string
  endDate?: string
  current: boolean
  description?: string
}

// A single education entry (LinkedIn-style).
export interface EducationEntry {
  id: string
  school: string
  degree?: string
  fieldOfStudy?: string
  startYear: string
  endYear?: string
  description?: string
}

export interface SignupInput {
  email: string
  password: string
  name: string
  role: SignupRole
}

export interface AuthContextValue {
  user: User | null
  isLoading: boolean
  login: (email: string, password: string) => Promise<void>
  signup: (input: SignupInput) => Promise<void>
  logout: () => void
  saveProfile: (profile: Profile) => void
}
