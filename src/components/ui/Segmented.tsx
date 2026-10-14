import { useId } from 'react'
import clsx from 'clsx'

interface SegmentedProps<T extends string> {
  label: string
  value: T
  options: { value: T; label: string }[]
  onChange: (value: T) => void
  className?: string
}

/** Compact single-choice switch (view modes, scales). Native radios keep arrow-key behaviour. */
export function Segmented<T extends string>({ label, value, options, onChange, className }: SegmentedProps<T>) {
  const name = useId()
  return (
    <fieldset className={clsx('inline-flex', className)}>
      <legend className="sr-only">{label}</legend>
      <div className="inline-flex flex-wrap gap-1 rounded-control border border-hairline bg-well p-1">
        {options.map((o) => (
          <label key={o.value} className="relative">
            <input
              type="radio"
              name={name}
              value={o.value}
              checked={value === o.value}
              onChange={() => onChange(o.value)}
              className="peer sr-only"
            />
            <span
              className={clsx(
                'inline-flex h-11 cursor-pointer items-center rounded-[4px] px-3 text-sm transition-colors duration-200 sm:h-8',
                'peer-focus-visible:outline-2 peer-focus-visible:outline-offset-1 peer-focus-visible:outline-accent',
                value === o.value ? 'bg-surface-raised font-medium text-ink shadow-[inset_0_-2px_0_var(--color-accent)]' : 'text-muted hover:text-ink',
              )}
            >
              {o.label}
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  )
}
