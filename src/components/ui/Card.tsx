import type { HTMLAttributes, ReactNode } from 'react'
import clsx from 'clsx'

export function Card({ className, ...props }: HTMLAttributes<HTMLElement>) {
  return (
    <section
      className={clsx('rounded-card border border-hairline bg-surface forced-border', className)}
      {...props}
    />
  )
}

interface CardHeaderProps {
  title: ReactNode
  /** Heading level for document outline; pages use h1, so cards default to h2. */
  as?: 'h2' | 'h3'
  description?: ReactNode
  actions?: ReactNode
  id?: string
  className?: string
}

export function CardHeader({ title, as: Heading = 'h2', description, actions, id, className }: CardHeaderProps) {
  return (
    <div className={clsx('flex flex-wrap items-start justify-between gap-x-4 gap-y-2 px-4 pt-4 sm:px-5', className)}>
      <div className="min-w-0">
        <Heading id={id} className="text-base font-semibold tracking-tight text-ink">
          {title}
        </Heading>
        {description && <p className="mt-0.5 text-sm text-muted">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </div>
  )
}

/** Small uppercase label used above numbers and in instrument-style readouts. */
export function Eyebrow({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span className={clsx('text-xs font-medium tracking-[0.08em] text-muted uppercase', className)}>{children}</span>
  )
}
