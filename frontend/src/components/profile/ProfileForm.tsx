import { useState } from 'react'
import type { FormEvent, ReactNode } from 'react'
import SuggestionInput from '../SuggestionInput'
import { majors } from '../../data/majors'
import { Button } from '../Button'
import { AvatarUpload } from './AvatarUpload'
import type { Profile, SignupRole } from '../../auth/types'
import { studentYears, industries, goalOptions } from '../../data/profileOptions'
import { ExperienceEditor } from './ExperienceEditor'
import { EducationEditor } from './EducationEditor'

const inputClass =
  'h-[52px] w-full rounded-xl border border-stone-300 bg-white px-4 text-base text-ink focus:border-osu focus:outline-none focus:ring-2 focus:ring-osu/30'

function Field({ id, label, optional, error, children }: {
  id: string; label: string; optional?: boolean; error?: string; children: ReactNode
}) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-bark">
        {label}{optional && <span className="font-medium normal-case tracking-normal text-stone-400"> · optional</span>}
      </label>
      {children}
      {error && <p role="alert" className="mt-1 text-sm text-red-600">{error}</p>}
    </div>
  )
}

function emptyProfile(): Profile {
  return { location: '', goals: [], experience: [], education: [], source: 'manual' }
}

export function ProfileForm({
  role,
  userName,
  initial,
  submitLabel,
  onSubmit,
}: {
  role: SignupRole
  userName: string
  initial?: Profile
  submitLabel: string
  onSubmit: (profile: Profile) => void
}) {
  // Merge over emptyProfile() so older/partial saved profiles (missing the
  // history arrays) never crash the history editors below.
  const [profile, setProfile] = useState<Profile>({ ...emptyProfile(), ...initial })
  const [goalError, setGoalError] = useState('')

  function set<K extends keyof Profile>(key: K, value: Profile[K]) {
    setProfile((p) => ({ ...p, [key]: value }))
  }

  function toggleGoal(goal: string) {
    setProfile((p) => ({
      ...p,
      goals: p.goals.includes(goal) ? p.goals.filter((g) => g !== goal) : [...p.goals, goal],
    }))
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (profile.goals.length === 0) return setGoalError('Choose at least one goal.')
    setGoalError('')
    onSubmit(profile)
  }

  return (
    <form className="mt-6" noValidate onSubmit={handleSubmit}>
      <div className="mb-6">
        <AvatarUpload name={userName} value={profile.avatarUrl} onChange={(url) => set('avatarUrl', url)} />
      </div>

      <div className="grid grid-cols-1 gap-x-7 gap-y-5 sm:grid-cols-2">
        {role === 'student' && (
          <>
            <Field id="studentYear" label="Year">
              <select id="studentYear" className={inputClass} value={profile.studentYear ?? ''} onChange={(e) => set('studentYear', e.target.value)}>
                <option value="">Select one</option>
                {studentYears.map((y) => <option key={y} value={y}>{y}</option>)}
              </select>
            </Field>
            <Field id="major" label="Major">
              <SuggestionInput id="major" className={inputClass} options={majors} placeholder="Start typing or enter your own" value={profile.major ?? ''} onChange={(v) => set('major', v)} />
            </Field>
          </>
        )}

        {role === 'alumnus' && (
          <>
            <Field id="graduationYear" label="Graduation year">
              <input id="graduationYear" inputMode="numeric" maxLength={4} className={inputClass} value={profile.graduationYear ?? ''} onChange={(e) => set('graduationYear', e.target.value)} />
            </Field>
            <Field id="industry" label="Industry">
              <select id="industry" className={inputClass} value={profile.industry ?? ''} onChange={(e) => set('industry', e.target.value)}>
                <option value="">Select one</option>
                {industries.map((i) => <option key={i} value={i}>{i}</option>)}
              </select>
            </Field>
            <Field id="company" label="Company">
              <input id="company" className={inputClass} value={profile.company ?? ''} onChange={(e) => set('company', e.target.value)} />
            </Field>
            <Field id="jobTitle" label="Job title">
              <input id="jobTitle" className={inputClass} value={profile.jobTitle ?? ''} onChange={(e) => set('jobTitle', e.target.value)} />
            </Field>
          </>
        )}

        {role === 'guest' && (
          <>
            <Field id="company" label="Company / organization">
              <input id="company" className={inputClass} value={profile.company ?? ''} onChange={(e) => set('company', e.target.value)} />
            </Field>
            <Field id="position" label="Position / title">
              <input id="position" className={inputClass} value={profile.position ?? ''} onChange={(e) => set('position', e.target.value)} />
            </Field>
            <Field id="industry" label="Industry">
              <select id="industry" className={inputClass} value={profile.industry ?? ''} onChange={(e) => set('industry', e.target.value)}>
                <option value="">Select one</option>
                {industries.map((i) => <option key={i} value={i}>{i}</option>)}
              </select>
            </Field>
          </>
        )}

        <Field id="location" label="Location">
          <input id="location" className={inputClass} value={profile.location} onChange={(e) => set('location', e.target.value)} />
        </Field>
        <Field id="linkedinUrl" label="LinkedIn" optional>
          <input id="linkedinUrl" className={inputClass} placeholder="linkedin.com/in/…" value={profile.linkedinUrl ?? ''} onChange={(e) => set('linkedinUrl', e.target.value)} />
        </Field>
      </div>

      <fieldset className="mt-7">
        <legend className="mb-2 text-xs font-bold uppercase tracking-wide text-bark">Goals</legend>
        <div className="grid grid-cols-1 gap-x-7 gap-y-3 sm:grid-cols-2">
          {goalOptions[role].map((goal) => (
            <label key={goal} className="flex items-center gap-3 text-[15px] text-ink">
              <input type="checkbox" className="h-5 w-5 rounded accent-osu" checked={profile.goals.includes(goal)} onChange={() => toggleGoal(goal)} />
              {goal}
            </label>
          ))}
        </div>
        {goalError && <p role="alert" className="mt-2 text-sm text-red-600">{goalError}</p>}
      </fieldset>

      <div className="mt-7">
        <p className="mb-2 text-xs font-bold uppercase tracking-wide text-bark">Experience</p>
        <ExperienceEditor value={profile.experience} onChange={(experience) => set('experience', experience)} />
      </div>

      <div className="mt-7">
        <p className="mb-2 text-xs font-bold uppercase tracking-wide text-bark">Education</p>
        <EducationEditor value={profile.education} onChange={(education) => set('education', education)} />
      </div>

      <Button type="submit" className="mt-8 w-full">{submitLabel}</Button>
    </form>
  )
}
