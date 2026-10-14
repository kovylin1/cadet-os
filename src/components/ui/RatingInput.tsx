import { useId } from 'react'
import clsx from 'clsx'
import type { Rating } from '../../types'

interface RatingInputProps {
  label: string
  value: Rating | null
  onChange: (value: Rating | null) => void
  /** Words for the 1 and 5 ends, e.g. ["Drained", "Fresh"]. */
  anchors: [string, string]
  optional?: boolean
  required?: boolean
  error?: string
}

const VALUES: Rating[] = [1, 2, 3, 4, 5]

/** 1–5 scale as a native radio group: arrow keys move between values, one tab stop. */
export function RatingInput({ label, value, onChange, anchors, optional, required, error }: RatingInputProps) {
  const name = useId()
  const errorId = `${name}-error`
  return (
    <fieldset className="flex flex-col gap-1.5" aria-describedby={error ? errorId : undefined}>
      <legend className="mb-1.5 text-sm font-medium text-ink">
        {label}
        {required && <span className="ml-1 font-normal text-muted">(required)</span>}
        {optional && <span className="ml-1 font-normal text-muted">(optional)</span>}
      </legend>
      <div className="flex items-center gap-1.5">
        {VALUES.map((v) => (
          <label key={v} className="relative">
            <input
              type="radio"
              name={name}
              value={v}
              checked={value === v}
              onChange={() => onChange(v)}
              className="peer sr-only"
            />
            <span
              className={clsx(
                'num flex size-11 cursor-pointer items-center justify-center rounded-control border text-sm transition-colors duration-200 sm:size-10',
                'peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-accent',
                value === v
                  ? 'border-accent bg-accent text-accent-ink'
                  : 'border-control bg-well text-ink hover:border-accent/70',
              )}
            >
              {v}
            </span>
          </label>
        ))}
        {optional && value != null && (
          <button
            type="button"
            onClick={() => onChange(null)}
            className="ml-1 rounded-control px-2 py-2 text-xs text-muted underline-offset-2 hover:text-ink hover:underline"
          >
            Clear
          </button>
        )}
      </div>
      <div className="flex w-[calc(5*2.75rem+4*0.375rem)] justify-between text-xs text-muted sm:w-[calc(5*2.5rem+4*0.375rem)]">
        <span>1 · {anchors[0]}</span>
        <span>{anchors[1]} · 5</span>
      </div>
      {error && (
        <p id={errorId} className="text-sm text-danger">
          {error}
        </p>
      )}
    </fieldset>
  )
}
