import { useId } from 'react'
import type { InputHTMLAttributes, ReactNode } from 'react'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string
  error?: string
  trailing?: ReactNode
}

export function Input({ label, error, id, trailing, ...props }: InputProps) {
  const generatedId = useId()
  const inputId = id ?? generatedId
  const errorId = `${inputId}-error`

  return (
    <div className="flex flex-col gap-1.5">
      <label
        htmlFor={inputId}
        className="text-xs font-semibold uppercase tracking-wide text-stone-500"
      >
        {label}
      </label>
      <div className="relative">
        <input
          id={inputId}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          className={`w-full rounded-xl border bg-white px-3.5 py-2.5 text-sm text-ink shadow-sm transition-[border-color,box-shadow] placeholder:text-stone-500 focus:outline-none focus:ring-2 focus:ring-osu/40 ${
            trailing ? 'pr-12' : ''
          } ${
            error
              ? 'border-red-400 focus:border-red-400 focus:ring-red-400/30'
              : 'border-stone-300 focus:border-osu'
          }`}
          {...props}
        />
        {trailing && (
          <div className="absolute inset-y-0 right-2 flex items-center">
            {trailing}
          </div>
        )}
      </div>
      {error && (
        <p id={errorId} role="alert" className="text-sm text-red-600">
          {error}
        </p>
      )}
    </div>
  )
}
