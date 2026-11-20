import { useState } from 'react'
import type { EducationEntry } from '../../auth/types'
import { Button } from '../Button'

const inputClass =
  'h-[46px] w-full rounded-xl border border-stone-300 bg-white px-3.5 text-sm text-ink focus:border-osu focus:outline-none focus:ring-2 focus:ring-osu/30'

function emptyDraft(): Omit<EducationEntry, 'id'> {
  return { school: '', degree: '', fieldOfStudy: '', startYear: '', endYear: '', description: '' }
}

export function EducationEditor({
  value,
  onChange,
}: {
  value: EducationEntry[]
  onChange: (next: EducationEntry[]) => void
}) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [adding, setAdding] = useState(false)
  const [draft, setDraft] = useState<Omit<EducationEntry, 'id'>>(emptyDraft())

  function startAdd() {
    setDraft(emptyDraft())
    setEditingId(null)
    setAdding(true)
  }

  function startEdit(entry: EducationEntry) {
    const { id, ...rest } = entry
    setDraft(rest)
    setEditingId(id)
    setAdding(true)
  }

  function cancel() {
    setAdding(false)
    setEditingId(null)
  }

  function save() {
    if (editingId) {
      onChange(value.map((e) => (e.id === editingId ? { id: editingId, ...draft } : e)))
    } else {
      onChange([...value, { id: crypto.randomUUID(), ...draft }])
    }
    cancel()
  }

  function remove(id: string) {
    onChange(value.filter((e) => e.id !== id))
  }

  return (
    <div>
      {value.length === 0 && !adding && (
        <p className="text-sm text-stone-500">No education added yet.</p>
      )}

      <div className="flex flex-col gap-3">
        {value.map((entry) => (
          <div key={entry.id} className="rounded-xl border border-stone-200 bg-white p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-semibold text-ink">{entry.school}</p>
                <p className="text-sm text-stone-500">
                  {[entry.degree, entry.fieldOfStudy].filter(Boolean).join(', ')}
                  {(entry.degree || entry.fieldOfStudy) && ' · '}
                  {entry.startYear}–{entry.endYear || 'present'}
                </p>
              </div>
              <div className="flex gap-2">
                <button type="button" className="text-sm font-semibold text-osu" onClick={() => startEdit(entry)}>Edit</button>
                <button
                  type="button"
                  aria-label={`Remove ${entry.school}`}
                  className="text-sm font-semibold text-stone-400 hover:text-red-600"
                  onClick={() => remove(entry.id)}
                >
                  Remove
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {adding ? (
        <div className="mt-3 rounded-xl border border-stone-200 bg-white p-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="flex flex-col gap-1 text-xs font-semibold text-bark">
              School
              <input className={inputClass} value={draft.school} onChange={(e) => setDraft({ ...draft, school: e.target.value })} />
            </label>
            <label className="flex flex-col gap-1 text-xs font-semibold text-bark">
              Degree
              <input className={inputClass} value={draft.degree} onChange={(e) => setDraft({ ...draft, degree: e.target.value })} />
            </label>
            <label className="flex flex-col gap-1 text-xs font-semibold text-bark">
              Field of study
              <input className={inputClass} value={draft.fieldOfStudy} onChange={(e) => setDraft({ ...draft, fieldOfStudy: e.target.value })} />
            </label>
            <label className="flex flex-col gap-1 text-xs font-semibold text-bark">
              Start year
              <input className={inputClass} inputMode="numeric" maxLength={4} value={draft.startYear} onChange={(e) => setDraft({ ...draft, startYear: e.target.value })} />
            </label>
            <label className="flex flex-col gap-1 text-xs font-semibold text-bark">
              End year (optional)
              <input className={inputClass} inputMode="numeric" maxLength={4} value={draft.endYear} onChange={(e) => setDraft({ ...draft, endYear: e.target.value })} />
            </label>
          </div>
          <label className="mt-3 flex flex-col gap-1 text-xs font-semibold text-bark">
            Description (optional)
            <textarea className="rounded-xl border border-stone-300 bg-white p-3 text-sm" rows={2} value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} />
          </label>
          <div className="mt-3 flex gap-2">
            <Button type="button" onClick={save}>Save education</Button>
            <Button type="button" variant="secondary" onClick={cancel}>Cancel</Button>
          </div>
        </div>
      ) : (
        <button type="button" onClick={startAdd} className="mt-3 text-sm font-semibold text-osu hover:underline">
          + Add education
        </button>
      )}
    </div>
  )
}
