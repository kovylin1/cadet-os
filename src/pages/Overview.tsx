import { useMemo, useState } from 'react'
import { format } from 'date-fns'
import { ArrowDownRight, ArrowRight, ArrowUpRight, CalendarCheck, Flame, Minus, Plus, Timer } from 'lucide-react'
import clsx from 'clsx'
import type { Attempt, CategoryId } from '../types'
import { SCORABLE_CATEGORIES, category } from '../lib/categories'
import { daysUntil, formatDay, todayKey } from '../lib/dates'
import {
  formatDelta,
  formatHours,
  formatValue,
  primaryScale,
  scaleKeysOf,
  scaleStats,
  sortAttempts,
  trainingSummary,
  valueOn,
} from '../lib/metrics'
import { messageFor } from '../lib/messages'
import { href } from '../lib/routes'
import { useData } from '../state/store'
import { TaskDialog } from '../components/forms/TaskDialog'
import { AttemptDialog } from '../components/forms/AttemptDialog'
import { TaskList } from '../components/TaskList'
import { Sparkline } from '../components/charts/Sparkline'
import { Button } from '../components/ui/Button'
import { Card, CardHeader, Eyebrow } from '../components/ui/Card'
import { CategoryChip, EmptyState } from '../components/ui/Misc'

const HEADLINE_CATEGORIES: CategoryId[] = ['math', 'physics', 'coordination', 'fast']

function greeting(d: Date) {
  const h = d.getHours()
  return h < 5 ? 'Good evening' : h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening'
}

export function Overview() {
  const data = useData()
  const now = new Date()
  const today = todayKey()
  const [addingTask, setAddingTask] = useState(false)
  const [recordFor, setRecordFor] = useState<CategoryId | null>(null)

  const days = daysUntil(data.settings.assessmentDate, now)
  const summary = useMemo(() => trainingSummary(data), [data])
  const byCategory = useMemo(() => {
    const map = new Map<CategoryId, Attempt[]>()
    for (const a of sortAttempts(data.attempts)) map.set(a.category, [...(map.get(a.category) ?? []), a])
    return map
  }, [data.attempts])

  const todayTasks = data.tasks.filter((t) => t.date === today)
  const overdue = data.tasks.filter((t) => !t.completed && t.date < today)
  const upcoming = data.tasks
    .filter((t) => !t.completed && t.date > today)
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 4)

  return (
    <div className="flex flex-col gap-6">
      {/* Header band: date, greeting, message, countdown */}
      <section aria-labelledby="overview-title" className="grid gap-6 border-b border-hairline pb-6 md:grid-cols-[1fr_auto] md:items-end">
        <div>
          <Eyebrow>{format(now, 'EEEE d MMMM yyyy')}</Eyebrow>
          <h1 id="overview-title" className="mt-2 text-2xl font-semibold tracking-tight sm:text-[32px] sm:leading-tight">
            {greeting(now)}
            {data.settings.callsign ? `, ${data.settings.callsign}` : ''}.
          </h1>
          <p className="mt-2 text-muted">{messageFor(now)}</p>
        </div>
        <div className="flex items-end gap-4 md:text-right" aria-live="off">
          <div>
            <Eyebrow>Assessment countdown</Eyebrow>
            {days >= 0 ? (
              <p className="mt-1 flex items-baseline gap-2 md:justify-end">
                <span className="num text-5xl font-semibold text-accent sm:text-6xl">{days}</span>
                <span className="text-muted">{days === 1 ? 'day' : 'days'} to go</span>
              </p>
            ) : (
              <p className="mt-1 text-xl font-semibold text-ink">Assessment completed</p>
            )}
            <p className="mt-1 text-sm text-muted">
              Air Astana Ab-Initio · {formatDay(data.settings.assessmentDate)}
            </p>
          </div>
        </div>
      </section>

      {/* Latest results */}
      <section aria-labelledby="latest-title">
        <div className="mb-3 flex items-baseline justify-between gap-4">
          <h2 id="latest-title" className="text-base font-semibold">
            Latest results
          </h2>
          <a href={href('performance')} className="inline-flex items-center gap-1 rounded-control text-sm text-accent hover:underline">
            All performance <ArrowRight size={14} aria-hidden />
          </a>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {HEADLINE_CATEGORIES.map((id) => (
            <ResultTile key={id} id={id} attempts={byCategory.get(id) ?? []} onRecord={() => setRecordFor(id)} />
          ))}
        </div>
      </section>

      {/* Training summary */}
      <section aria-label="Training summary" className="grid grid-cols-3 gap-3">
        <StatTile icon={CalendarCheck} label="Sessions completed" value={String(summary.sessions)} />
        <StatTile icon={Flame} label="Current streak" value={String(summary.streak)} unit={summary.streak === 1 ? 'day' : 'days'} />
        <StatTile icon={Timer} label="Training hours" value={formatHours(summary.minutes)} unit="h" />
      </section>

      <div className="grid gap-6 lg:grid-cols-[1.25fr_1fr]">
        <Card aria-labelledby="today-title">
          <CardHeader
            id="today-title"
            title="Today’s plan"
            description={formatDay(today, 'EEEE d MMMM')}
            actions={
              <Button variant="primary" size="sm" onClick={() => setAddingTask(true)}>
                <Plus size={16} aria-hidden /> Add task
              </Button>
            }
          />
          <div className="flex flex-col gap-5 px-4 pt-4 pb-5 sm:px-5">
            {todayTasks.length ? (
              <TaskList tasks={todayTasks} label="Today’s tasks" />
            ) : (
              <EmptyState icon={CalendarCheck} title="Nothing planned for today">
                Add one focused session — or plan a rest day. Recovery counts.
              </EmptyState>
            )}
            {overdue.length > 0 && (
              <div>
                <h3 className="mb-2 text-sm font-medium text-warn">Still open from earlier ({overdue.length})</h3>
                <TaskList tasks={overdue} label="Overdue tasks" showDate />
              </div>
            )}
            {upcoming.length > 0 && (
              <div>
                <h3 className="mb-2 text-sm font-medium text-muted">Coming up</h3>
                <ul className="flex flex-col gap-1.5">
                  {upcoming.map((t) => (
                    <li key={t.id} className="flex items-center justify-between gap-3 text-sm">
                      <span className="min-w-0 truncate text-ink">{t.title}</span>
                      <span className="num shrink-0 text-muted">{formatDay(t.date, 'EEE d MMM')}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <a href={href('calendar')} className="inline-flex items-center gap-1 self-start rounded-control text-sm text-accent hover:underline">
              Open calendar <ArrowRight size={14} aria-hidden />
            </a>
          </div>
        </Card>

        <Card aria-labelledby="trends-title">
          <CardHeader
            id="trends-title"
            title="Category trends"
            description="Each category on its own scale — never averaged together."
          />
          <div className="px-4 pt-3 pb-4 sm:px-5">
            <CategoryTrends byCategory={byCategory} />
          </div>
        </Card>
      </div>

      <TaskDialog open={addingTask} onClose={() => setAddingTask(false)} defaultDate={today} />
      <AttemptDialog open={recordFor != null} onClose={() => setRecordFor(null)} defaultCategory={recordFor ?? undefined} />
    </div>
  )
}

function ResultTile({ id, attempts, onRecord }: { id: CategoryId; attempts: Attempt[]; onRecord: () => void }) {
  const meta = category(id)
  const latest = attempts[attempts.length - 1]
  const scale = latest ? primaryScale(latest) : null

  if (!latest || !scale) {
    return (
      <Card className="flex flex-col justify-between gap-4 p-4">
        <CategoryChip id={id} className="self-start" />
        <div>
          <p className="text-lg font-medium text-muted">No score yet</p>
          <p className="mt-1 text-sm text-muted">Record a result when you have one.</p>
        </div>
        <Button size="sm" onClick={onRecord} className="self-start">
          <Plus size={16} aria-hidden /> Record {meta.short} result
        </Button>
      </Card>
    )
  }

  const stats = scaleStats(attempts, scale)!
  const secondary = scaleKeysOf(latest).slice(1)
  const delta = stats.changeFromPrevious
  const isBest = stats.best.attempt.id === latest.id && stats.count > 1

  return (
    <Card className="flex flex-col gap-3 p-4">
      <div className="flex items-center justify-between gap-2">
        <CategoryChip id={id} />
        <span className="text-xs text-muted">{formatDay(latest.date, 'd MMM')}</span>
      </div>
      <p className="num text-[32px] leading-none font-semibold text-ink">{formatValue(stats.latest.value, scale)}</p>
      {secondary.length > 0 && (
        <p className="num text-sm text-muted">
          {secondary.map((k) => formatValue(valueOn(latest, k)!, k)).join(' · ')}
        </p>
      )}
      <p className="mt-auto flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
        {delta == null ? (
          <span className="text-muted">First attempt</span>
        ) : (
          <span className={clsx('inline-flex items-center gap-1', delta > 0 ? 'text-good' : delta < 0 ? 'text-warn' : 'text-muted')}>
            {delta > 0 ? <ArrowUpRight size={15} aria-hidden /> : delta < 0 ? <ArrowDownRight size={15} aria-hidden /> : <Minus size={15} aria-hidden />}
            <span className="num">{formatDelta(delta, scale)}</span>
            <span className="text-muted">vs previous</span>
          </span>
        )}
        {isBest && <span className="text-xs font-medium text-good">Personal best</span>}
      </p>
    </Card>
  )
}

function StatTile({ icon: Icon, label, value, unit }: { icon: typeof Flame; label: string; value: string; unit?: string }) {
  return (
    <div className="rounded-card border border-hairline px-3 py-3 sm:px-4">
      <p className="flex items-center gap-1.5 text-xs text-muted sm:text-sm">
        <Icon size={15} aria-hidden className="hidden text-accent sm:block" />
        {label}
      </p>
      <p className="mt-1.5">
        <span className="num text-2xl font-semibold text-ink">{value}</span>
        {unit && <span className="ml-1 text-sm text-muted">{unit}</span>}
      </p>
    </div>
  )
}

function CategoryTrends({ byCategory }: { byCategory: Map<CategoryId, Attempt[]> }) {
  const rows = SCORABLE_CATEGORIES.map((c) => {
    const attempts = byCategory.get(c.id) ?? []
    const latest = attempts[attempts.length - 1]
    const scale = latest ? primaryScale(latest) : null
    return { c, attempts, scale, stats: scale ? scaleStats(attempts, scale) : null }
  }).filter((r) => r.stats)

  if (!rows.length) {
    return (
      <EmptyState icon={ArrowUpRight} title="No results yet">
        Record your first practice result to see trends.
      </EmptyState>
    )
  }

  return (
    <ul className="flex flex-col divide-y divide-hairline">
      {rows.map(({ c, stats }) => {
        const Icon = c.icon
        return (
          <li key={c.id}>
            <a
              href={`${href('performance')}?cat=${c.id}`}
              className="-mx-2 flex items-center gap-3 rounded-control px-2 py-2.5 transition-colors duration-200 hover:bg-surface-raised"
            >
              <Icon size={16} aria-hidden className="shrink-0 text-accent" />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm text-ink">{c.short}</span>
                <span className="block text-xs text-muted">
                  {stats!.count} {stats!.count === 1 ? 'attempt' : 'attempts'} ·{' '}
                  {stats!.scale === 'percentage' ? '%' : stats!.scale === 'sten' ? 'sten' : stats!.scale === 'scaled' ? 'scaled' : 'raw'}
                </span>
              </span>
              <Sparkline stats={stats!} width={88} height={28} />
              <span className="num w-16 shrink-0 text-right text-sm text-ink">
                {formatValue(stats!.latest.value, stats!.scale).split(' ')[0]}
              </span>
            </a>
          </li>
        )
      })}
    </ul>
  )
}
