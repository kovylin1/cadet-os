import { useEffect, useState, type ReactNode } from 'react'
import { ChevronDown, type LucideIcon } from 'lucide-react'
import clsx from 'clsx'
import { ROUTES, href, studyHref, useStudyTab, type RouteId } from '../../lib/routes'
import { useData } from '../../state/store'
import { daysUntil, formatDay } from '../../lib/dates'
import { Logo } from './Logo'

export function AppShell({ route, children }: { route: RouteId; children: ReactNode }) {
  const { settings } = useData()
  const days = daysUntil(settings.assessmentDate)
  const studyTab = useStudyTab()

  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[232px_1fr]">
      <a
        href="#main"
        onClick={(e) => {
          // Hash routing owns the URL fragment, so move focus without touching it.
          e.preventDefault()
          document.getElementById('main')?.focus()
        }}
        className="sr-only z-50 rounded-control bg-accent px-4 py-2 font-medium text-accent-ink focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
      >
        Skip to main content
      </a>

      {/* Desktop sidebar */}
      <div className="sticky top-0 hidden h-dvh flex-col border-r border-hairline bg-plane px-4 py-5 lg:flex">
        <a href={href('overview')} className="rounded-control px-2 py-1" aria-label="CADET OS — Overview">
          <Logo />
        </a>
        <nav aria-label="Main" className="mt-8">
          <ul className="flex flex-col gap-1">
            {ROUTES.map((r) =>
              r.children ? (
                <NavGroup key={r.id} route={r} active={r.id === route} />
              ) : (
                <li key={r.id}>
                  <NavLink href={href(r.id)} active={r.id === route} icon={r.icon} label={r.label} />
                </li>
              ),
            )}
          </ul>
        </nav>
        <div className="mt-auto rounded-card border border-hairline bg-surface px-3 py-3">
          <p className="text-xs text-muted">Assessment</p>
          <p className="mt-0.5 text-sm text-ink">{formatDay(settings.assessmentDate, 'EEE d MMM yyyy')}</p>
          <p className="num mt-1 text-sm text-accent">
            {days > 0 ? `T−${days} days` : days === 0 ? 'Today' : 'Completed'}
          </p>
        </div>
      </div>

      <div className="flex min-w-0 flex-col">
        {/* Mobile / tablet top bar */}
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-hairline bg-plane/95 px-4 backdrop-blur-sm lg:hidden">
          <a href={href('overview')} className="rounded-control" aria-label="CADET OS — Overview">
            <Logo />
          </a>
          <span className="num text-sm text-accent">{days > 0 ? `T−${days}d` : days === 0 ? 'Today' : ''}</span>
        </header>

        <main id="main" tabIndex={-1} className="flex-1 px-4 pt-5 pb-28 focus:outline-none sm:px-6 lg:px-10 lg:pt-8 lg:pb-12">
          <div className="mx-auto w-full max-w-[1200px]">{children}</div>
        </main>

        {/* Mobile / tablet bottom tab bar */}
        <nav
          aria-label="Main"
          className="fixed inset-x-0 bottom-0 z-30 border-t border-hairline bg-plane/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-sm lg:hidden"
        >
          <ul className="mx-auto grid max-w-lg grid-cols-6">
            {ROUTES.map((r) => {
              const active = r.id === route
              const Icon = r.icon
              return (
                <li key={r.id}>
                  <a
                    href={r.children ? studyHref(studyTab) : href(r.id)}
                    aria-current={active ? 'page' : undefined}
                    className={clsx(
                      'flex h-16 flex-col items-center justify-center gap-1 text-[11px] transition-colors duration-200 sm:text-xs',
                      active ? 'text-accent' : 'text-muted hover:text-ink',
                    )}
                  >
                    <Icon size={20} aria-hidden />
                    {r.short}
                  </a>
                </li>
              )
            })}
          </ul>
        </nav>
      </div>
    </div>
  )
}

export function PageHeader({ title, description, actions }: { title: string; description?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        <h1 className="text-2xl font-semibold tracking-tight text-ink sm:text-[28px]">{title}</h1>
        {description && <p className="mt-1 max-w-2xl text-muted">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  )
}

function NavLink({ href: to, active, icon: Icon, label, nested = false }: { href: string; active: boolean; icon: LucideIcon; label: string; nested?: boolean }) {
  return (
    <a
      href={to}
      aria-current={active ? 'page' : undefined}
      className={clsx(
        'relative flex items-center gap-3 rounded-control px-3 text-sm transition-colors duration-200',
        nested ? 'h-9 pl-9' : 'h-10',
        active ? 'bg-surface font-medium text-ink' : 'text-muted hover:bg-surface/60 hover:text-ink',
      )}
    >
      {active && <span aria-hidden className="absolute inset-y-2 left-0 w-0.5 rounded-full bg-accent" />}
      <Icon size={nested ? 16 : 18} aria-hidden className={active ? 'text-accent' : undefined} />
      {label}
    </a>
  )
}

/** Disclosure group: "Study" unfolds into Mathematics and Physics. */
function NavGroup({ route, active }: { route: (typeof ROUTES)[number]; active: boolean }) {
  const tab = useStudyTab()
  const [open, setOpen] = useState(active)
  useEffect(() => {
    if (active) setOpen(true)
  }, [active])
  const Icon = route.icon
  const listId = `nav-${route.id}`
  return (
    <li>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={listId}
        onClick={() => setOpen((o) => !o)}
        className={clsx(
          'flex h-10 w-full items-center gap-3 rounded-control px-3 text-sm transition-colors duration-200',
          active ? 'font-medium text-ink' : 'text-muted hover:bg-surface/60 hover:text-ink',
        )}
      >
        <Icon size={18} aria-hidden className={active ? 'text-accent' : undefined} />
        {route.label}
        <ChevronDown size={16} aria-hidden className={clsx('ml-auto transition-transform duration-200', open && 'rotate-180')} />
      </button>
      <ul id={listId} hidden={!open} className="mt-1 flex flex-col gap-1">
        {route.children!.map((c) => (
          <li key={c.id}>
            <NavLink href={studyHref(c.id)} active={active && tab === c.id} icon={c.icon} label={c.label} nested />
          </li>
        ))}
      </ul>
    </li>
  )
}
