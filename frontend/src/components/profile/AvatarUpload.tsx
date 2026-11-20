import { useId, useRef } from 'react'

// Resizes a picked image to a square data-URL (≤ 256px) for the mock store.
async function toDataUrl(file: File): Promise<string> {
  const bitmap = await createImageBitmap(file)
  const size = Math.min(256, bitmap.width, bitmap.height)
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')
  if (!ctx) return ''
  const sx = (bitmap.width - size) / 2
  const sy = (bitmap.height - size) / 2
  ctx.drawImage(bitmap, sx, sy, size, size, 0, 0, size, size)
  return canvas.toDataURL('image/jpeg', 0.85)
}

export function AvatarUpload({
  name,
  value,
  onChange,
}: {
  name: string
  value?: string
  onChange: (dataUrl: string) => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const id = useId()
  const initial = name.trim().charAt(0).toUpperCase() || '?'

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) return
    onChange(await toDataUrl(file))
  }

  return (
    <div className="flex items-center gap-5">
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="relative grid h-20 w-20 place-items-center overflow-hidden rounded-full border border-stone-300 bg-bark-tint text-2xl font-bold text-bark"
      >
        {value ? (
          <img src={value} alt="" className="h-full w-full object-cover" />
        ) : (
          initial
        )}
        <span className="absolute -bottom-0.5 -right-0.5 grid h-7 w-7 place-items-center rounded-full border-[3px] border-white bg-osu text-white">
          <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
            <circle cx="12" cy="13" r="4" />
          </svg>
        </span>
      </button>
      <label htmlFor={id} className="cursor-pointer text-sm font-semibold text-bark" onClick={() => inputRef.current?.click()}>
        Add a profile photo
      </label>
      <input
        ref={inputRef}
        id={id}
        type="file"
        accept="image/*"
        className="sr-only"
        aria-label="Add a profile photo"
        onChange={handleFile}
      />
    </div>
  )
}
