import type { SignupRole } from '../auth/types'

export const studentYears = [
  'First year', 'Second year', 'Third year', 'Fourth year', 'Fifth year or later', 'Graduate student',
]

export const industries = [
  'Agriculture and Natural Resources', 'Arts, Media, and Entertainment', 'Business and Consulting',
  'Construction and Manufacturing', 'Education', 'Energy and Environment', 'Engineering',
  'Finance and Insurance', 'Government and Nonprofit', 'Healthcare', 'Hospitality and Tourism',
  'Marketing and Sales', 'Science and Research', 'Technology', 'Other',
]

export const goalOptions: Record<SignupRole, string[]> = {
  student: ['Find a mentor', 'Find an internship or job', 'Explore career paths', 'Grow my network'],
  alumnus: ['Mentor students', 'Recruit or hire', 'Give career advice', 'Grow my network'],
  guest: ['Recruit or hire', 'Grow my network', 'Mentor students', 'Explore career paths'],
}
