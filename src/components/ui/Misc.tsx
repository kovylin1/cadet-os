import type { ReactNode } from 'react'
import clsx from 'clsx'
import type { LucideIcon } from 'lucide-react'
import type { CategoryId } from '../../types'
import { category } from '../../lib/categories'

export function CategoryChip({ id, short = false, className }: { id: CategoryId; short?: boolean; className?: string }) {
  const meta = category(id)
  const Icon = meta.icon
  return (
    <span
      className={clsx(
        'inline-flex max-w-full items-center gap-1.5 rounded-full border border-hairline bg-well px-2 py-0.5 text-xs text-muted',
        className,
      )}
    >
      <Icon size={13} aria-hidden className="shrink-0 text-accent" />
      <span className="truncate">{short ? meta.short : meta.label}</span>
    </span>
  )
}

interface EmptyStateProps {
  icon: LucideIcon
  title: string
  children?: ReactNode
  action?: ReactNode
  className?: string
}

export function EmptyState({ icon: Icon, title, children, action, className }: EmptyStateProps) {
  return (
    <div
      className={clsx(
        'flex flex-col items-center justify-center gap-2 rounded-card border border-dashed border-hairline px-6 py-8 text-center',
        className,
      )}
    >
      <Icon size={22} aria-hidden className="text-muted" />
      <p className="font-medium text-ink">{title}</p>
      {children && <div className="max-w-sm text-sm text-muted">{children}</div>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  )
}

/** Explanatory note for caveats (e.g. correlation ≠ causation). Info icon, never colour alone. */
export function Note({ icon: Icon, children, tone = 'info' }: { icon: LucideIcon; children: ReactNode; tone?: 'info' | 'warn' }) {
  return (
    <div
      className={clsx(
        'flex gap-2.5 rounded-control border px-3 py-2.5 text-sm',
        tone === 'warn' ? 'border-warn/40 bg-warn/8 text-ink' : 'border-hairline bg-well text-muted',
      )}
    >
      <Icon size={16} aria-hidden className={clsx('mt-0.5 shrink-0', tone === 'warn' ? 'text-warn' : 'text-accent')} />
      <div>{children}</div>
    </div>
  )
}
