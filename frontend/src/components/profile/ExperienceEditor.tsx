import { useState } from 'react'
import type { ExperienceEntry } from '../../auth/types'
import { Button } from '../Button'

const inputClass =
  'h-[46px] w-full rounded-xl border border-stone-300 bg-white px-3.5 text-sm text-ink focus:border-osu focus:outline-none focus:ring-2 focus:ring-osu/30'

function emptyDraft(): Omit<ExperienceEntry, 'id'> {
  return { title: '', company: '', location: '', startDate: '', endDate: '', current: false, description: '' }
}

export function ExperienceEditor({
  value,
  onChange,
}: {
  value: ExperienceEntry[]
  onChange: (next: ExperienceEntry[]) => void
}) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [adding, setAdding] = useState(false)
  const [draft, setDraft] = useState<Omit<ExperienceEntry, 'id'>>(emptyDraft())

  function startAdd() {
    setDraft(emptyDraft())
    setEditingId(null)
    setAdding(true)
  }

  function startEdit(entry: ExperienceEntry) {
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
        <p className="text-sm text-stone-500">No experience added yet.</p>
      )}

      <div className="flex flex-col gap-3">
        {value.map((entry) => (
          <div key={entry.id} className="rounded-xl border border-stone-200 bg-white p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-semibold text-ink">{entry.title} · {entry.company}</p>
                <p className="text-sm text-stone-500">
                  {entry.startDate} – {entry.current ? 'Present' : entry.endDate}
                </p>
              </div>
              <div className="flex gap-2">
                <button type="button" className="text-sm font-semibold text-osu" onClick={() => startEdit(entry)}>Edit</button>
                <button
                  type="button"
                  aria-label={`Remove ${entry.title} at ${entry.company}`}
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
              Title
              <input className={inputClass} value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} />
            </label>
            <label className="flex flex-col gap-1 text-xs font-semibold text-bark">
              Company
              <input className={inputClass} value={draft.company} onChange={(e) => setDraft({ ...draft, company: e.target.value })} />
            </label>
            <label className="flex flex-col gap-1 text-xs font-semibold text-bark">
              Location
              <input className={inputClass} value={draft.location} onChange={(e) => setDraft({ ...draft, location: e.target.value })} />
            </label>
            <label className="flex flex-col gap-1 text-xs font-semibold text-bark">
              Start date
              <input className={inputClass} placeholder="Jun 2025" value={draft.startDate} onChange={(e) => setDraft({ ...draft, startDate: e.target.value })} />
            </label>
            {!draft.current && (
              <label className="flex flex-col gap-1 text-xs font-semibold text-bark">
                End date
                <input className={inputClass} placeholder="Aug 2025" value={draft.endDate} onChange={(e) => setDraft({ ...draft, endDate: e.target.value })} />
              </label>
            )}
            <label className="flex items-center gap-2 self-end text-sm text-ink">
              <input
                type="checkbox"
                className="h-5 w-5 rounded accent-osu"
                checked={draft.current}
                onChange={(e) => setDraft({ ...draft, current: e.target.checked, endDate: e.target.checked ? '' : draft.endDate })}
              />
              I currently work here
            </label>
          </div>
          <label className="mt-3 flex flex-col gap-1 text-xs font-semibold text-bark">
            Description (optional)
            <textarea className="rounded-xl border border-stone-300 bg-white p-3 text-sm" rows={2} value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} />
          </label>
          <div className="mt-3 flex gap-2">
            <Button type="button" onClick={save}>Save experience</Button>
            <Button type="button" variant="secondary" onClick={cancel}>Cancel</Button>
          </div>
        </div>
      ) : (
        <button type="button" onClick={startAdd} className="mt-3 text-sm font-semibold text-osu hover:underline">
          + Add experience
        </button>
      )}
    </div>
  )
}
