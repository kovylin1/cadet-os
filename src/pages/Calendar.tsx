import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react'
import {
  addDays,
  addMonths,
  addWeeks,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameMonth,
  startOfMonth,
  startOfWeek,
} from 'date-fns'
import { AlertTriangle, CalendarPlus, Check, ChevronLeft, ChevronRight, Diamond, HeartPulse, Plus } from 'lucide-react'
import clsx from 'clsx'
import type { Task } from '../types'
import { category } from '../lib/categories'
import { formatDay, fromDayKey, toDayKey, todayKey } from '../lib/dates'
import { formatValue, primaryScale, valueOn } from '../lib/metrics'
import { href } from '../lib/routes'
import { useData } from '../state/store'
import { PageHeader } from '../components/layout/AppShell'
import { TaskDialog } from '../components/forms/TaskDialog'
import { TaskList } from '../components/TaskList'
import { AiBridgeButton } from '../components/AiBridge'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { EmptyState } from '../components/ui/Misc'
import { Segmented } from '../components/ui/Segmented'

type View = 'month' | 'week'

interface DayInfo {
  tasks: Task[]
  done: number
  pending: number
  results: number
  checkIns: number
}

const VIEW_KEY = 'cadet-os:calendar-view'

function loadView(): View {
  try {
    return window.localStorage.getItem(VIEW_KEY) === 'week' ? 'week' : 'month'
  } catch {
    return 'month'
  }
}

export function Calendar() {
  const data = useData()
  const today = todayKey()
  const [selected, setSelected] = useState(today)
  const [view, setView] = useState<View>(loadView)
  const [adding, setAdding] = useState(false)
  const focusAfterMove = useRef(false)
  const gridRef = useRef<HTMLDivElement>(null)
  const weekStartsOn = data.settings.weekStartsOn

  useEffect(() => {
    try {
      window.localStorage.setItem(VIEW_KEY, view)
    } catch {
      // view preference is a convenience only
    }
  }, [view])

  const byDay = useMemo(() => {
    const map = new Map<string, DayInfo>()
    const get = (k: string) => {
      let d = map.get(k)
      if (!d) map.set(k, (d = { tasks: [], done: 0, pending: 0, results: 0, checkIns: 0 }))
      return d
    }
    for (const t of data.tasks) {
      const d = get(t.date)
      d.tasks.push(t)
      if (t.completed) d.done += 1
      else d.pending += 1
    }
    for (const a of data.attempts) get(a.date).results += 1
    for (const s of data.sessions) get(s.date).checkIns += 1
    return map
  }, [data.tasks, data.attempts, data.sessions])

  const selectedDate = fromDayKey(selected)
  const days = useMemo(() => {
    const start =
      view === 'month'
        ? startOfWeek(startOfMonth(selectedDate), { weekStartsOn })
        : startOfWeek(selectedDate, { weekStartsOn })
    const end =
      view === 'month' ? endOfWeek(endOfMonth(selectedDate), { weekStartsOn }) : endOfWeek(selectedDate, { weekStartsOn })
    return eachDayOfInterval({ start, end })
    // `selected` (as a key) drives the visible range; selectedDate is derived from it.
  }, [selected, view, weekStartsOn])

  const weekdayLabels = days.slice(0, 7).map((d) => ({ short: format(d, 'EEEEE'), long: format(d, 'EEE') }))

  useEffect(() => {
    if (!focusAfterMove.current) return
    focusAfterMove.current = false
    gridRef.current?.querySelector<HTMLButtonElement>(`[data-day="${selected}"]`)?.focus()
  }, [selected])

  function move(to: Date, focus = false) {
    focusAfterMove.current = focus
    setSelected(toDayKey(to))
  }

  function onGridKey(e: KeyboardEvent) {
    const steps: Record<string, () => Date> = {
      ArrowLeft: () => addDays(selectedDate, -1),
      ArrowRight: () => addDays(selectedDate, 1),
      ArrowUp: () => addDays(selectedDate, -7),
      ArrowDown: () => addDays(selectedDate, 7),
      Home: () => startOfWeek(selectedDate, { weekStartsOn }),
      End: () => endOfWeek(selectedDate, { weekStartsOn }),
      PageUp: () => addMonths(selectedDate, -1),
      PageDown: () => addMonths(selectedDate, 1),
    }
    const step = steps[e.key]
    if (!step) return
    e.preventDefault()
    move(step(), true)
  }

  const step = (dir: 1 | -1) => move(view === 'month' ? addMonths(selectedDate, dir) : addWeeks(selectedDate, dir))

  const rangeTitle =
    view === 'month'
      ? format(selectedDate, 'MMMM yyyy')
      : `${format(days[0], 'd MMM')} – ${format(days[days.length - 1], 'd MMM yyyy')}`

  const info = byDay.get(selected)
  const dayAttempts = data.attempts.filter((a) => a.date === selected)
  const daySessions = data.sessions.filter((s) => s.date === selected)

  return (
    <>
      <PageHeader
        title="Calendar"
        description="Plan each training day, tick sessions off, and keep completed work as history."
        actions={
          <>
          <AiBridgeButton />
          <Button variant="primary" onClick={() => setAdding(true)}>
            <Plus size={16} aria-hidden /> Add task
          </Button>
          </>
        }
      />

      <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
        <Card aria-labelledby="cal-range" className="p-3 sm:p-4">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon-sm" onClick={() => step(-1)} aria-label={view === 'month' ? 'Previous month' : 'Previous week'}>
                <ChevronLeft size={18} aria-hidden />
              </Button>
              <Button variant="ghost" size="icon-sm" onClick={() => step(1)} aria-label={view === 'month' ? 'Next month' : 'Next week'}>
                <ChevronRight size={18} aria-hidden />
              </Button>
              <h2 id="cal-range" aria-live="polite" className="ml-1 text-lg font-semibold tracking-tight">
                {rangeTitle}
              </h2>
            </div>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="ghost" onClick={() => move(new Date())}>
                Today
              </Button>
              <Segmented
                label="Calendar view"
                value={view}
                onChange={setView}
                options={[
                  { value: 'month', label: 'Month' },
                  { value: 'week', label: 'Week' },
                ]}
              />
            </div>
          </div>

          <div ref={gridRef} role="group" aria-label={`${rangeTitle}. Use arrow keys to move between days.`} onKeyDown={onGridKey}>
            <div aria-hidden className="grid grid-cols-7 gap-1 pb-1.5 text-center text-xs text-muted">
              {weekdayLabels.map((w, i) => (
                <span key={i}>
                  <span className="sm:hidden">{w.short}</span>
                  <span className="hidden sm:inline">{w.long}</span>
                </span>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {days.map((d) => {
                const key = toDayKey(d)
                return (
                  <DayCell
                    key={key}
                    dayKey={key}
                    date={d}
                    info={byDay.get(key)}
                    selected={key === selected}
                    isToday={key === today}
                    outside={view === 'month' && !isSameMonth(d, selectedDate)}
                    tall={view === 'week'}
                    onSelect={() => setSelected(key)}
                  />
                )
              })}
            </div>
          </div>

          <ul aria-label="Legend" className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
            <li className="flex items-center gap-1.5">
              <span className="size-2 rounded-full border-[1.5px] border-accent" /> Planned
            </li>
            <li className="flex items-center gap-1.5">
              <span className="size-2 rounded-full bg-good" /> Completed
            </li>
            <li className="flex items-center gap-1.5">
              <span className="size-2 bg-warn" /> Overdue
            </li>
            <li className="flex items-center gap-1.5">
              <Diamond size={10} className="fill-accent text-accent" aria-hidden /> Result logged
            </li>
          </ul>
        </Card>

        <Card aria-labelledby="day-title" className="self-start">
          <div className="flex items-start justify-between gap-3 border-b border-hairline px-4 py-4 sm:px-5">
            <div>
              <h2 id="day-title" className="font-semibold tracking-tight">
                {formatDay(selected, 'EEEE d MMMM')}
              </h2>
              <p className="mt-0.5 text-sm text-muted">
                {selected === today ? 'Today' : formatDay(selected, 'yyyy')}
                {info?.tasks.length ? ` · ${info.done}/${info.tasks.length} done` : ''}
              </p>
            </div>
            <Button size="sm" onClick={() => setAdding(true)}>
              <Plus size={16} aria-hidden /> Task
            </Button>
          </div>
          <div className="flex flex-col gap-5 px-4 py-4 sm:px-5">
            {info?.tasks.length ? (
              <TaskList tasks={info.tasks} label={`Tasks for ${formatDay(selected, 'd MMMM')}`} />
            ) : (
              <EmptyState
                icon={CalendarPlus}
                title="No tasks on this day"
                action={
                  <Button size="sm" onClick={() => setAdding(true)}>
                    <Plus size={16} aria-hidden /> Plan a session
                  </Button>
                }
              />
            )}

            {dayAttempts.length > 0 && (
              <div>
                <h3 className="mb-2 text-sm font-medium text-muted">Results logged</h3>
                <ul className="flex flex-col gap-2">
                  {dayAttempts.map((a) => {
                    const scale = primaryScale(a)
                    const value = scale ? valueOn(a, scale) : null
                    return (
                      <li key={a.id}>
                        <a
                          href={`${href('performance')}?cat=${a.category}`}
                          className="-mx-2 flex items-center justify-between gap-3 rounded-control px-2 py-1.5 text-sm hover:bg-surface-raised"
                        >
                          <span className="flex min-w-0 items-center gap-2">
                            <Diamond size={10} className="shrink-0 fill-accent text-accent" aria-hidden />
                            <span className="truncate text-ink">{a.name}</span>
                          </span>
                          <span className="num shrink-0 text-ink">
                            {scale && value != null ? formatValue(value, scale).split(' ')[0] : '—'}
                          </span>
                        </a>
                      </li>
                    )
                  })}
                </ul>
              </div>
            )}

            {daySessions.length > 0 && (
              <div>
                <h3 className="mb-2 text-sm font-medium text-muted">Check-ins</h3>
                <ul className="flex flex-col gap-1.5 text-sm">
                  {daySessions.map((s) => (
                    <li key={s.id} className="flex items-center gap-2 text-ink">
                      <HeartPulse size={14} aria-hidden className="text-good" />
                      <span className="num">{s.durationMinutes} min</span>
                      <span className="text-muted">
                        energy {s.energyBefore}→{s.energyAfter} · focus {s.concentration}/5
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </Card>
      </div>

      <TaskDialog open={adding} onClose={() => setAdding(false)} defaultDate={selected} />
    </>
  )
}

interface DayCellProps {
  dayKey: string
  date: Date
  info: DayInfo | undefined
  selected: boolean
  isToday: boolean
  outside: boolean
  tall: boolean
  onSelect: () => void
}

function DayCell({ dayKey, date, info, selected, isToday, outside, tall, onSelect }: DayCellProps) {
  const today = todayKey()
  const overdue = info && info.pending > 0 && dayKey < today
  const parts = [format(date, 'EEEE d MMMM')]
  if (isToday) parts.push('today')
  if (info?.tasks.length) parts.push(`${info.tasks.length} ${info.tasks.length === 1 ? 'task' : 'tasks'}, ${info.done} completed`)
  if (overdue) parts.push(`${info!.pending} overdue`)
  if (info?.results) parts.push(`${info.results} ${info.results === 1 ? 'result' : 'results'} logged`)

  const visibleTasks = info?.tasks.slice(0, tall ? 6 : 2) ?? []
  const hidden = (info?.tasks.length ?? 0) - visibleTasks.length

  return (
    <button
      type="button"
      data-day={dayKey}
      tabIndex={selected ? 0 : -1}
      aria-pressed={selected}
      aria-current={isToday ? 'date' : undefined}
      aria-label={(selected ? 'Selected, ' : '') + parts.join(', ')}
      onClick={onSelect}
      className={clsx(
        'group relative flex flex-col items-stretch rounded-control border p-1 text-left transition-colors duration-200 sm:p-1.5',
        tall ? 'min-h-24 sm:min-h-56' : 'min-h-12 sm:min-h-24',
        selected
          ? 'border-accent bg-accent/10'
          : 'border-transparent bg-well hover:border-control',
        outside && !selected && 'bg-transparent',
      )}
    >
      <span className="flex items-center justify-between">
        <span
          className={clsx(
            'num flex size-6 items-center justify-center rounded-full text-[13px]',
            isToday ? 'bg-accent font-semibold text-accent-ink' : outside ? 'text-muted' : 'text-ink',
          )}
        >
          {format(date, 'd')}
        </span>
        {info?.results ? <Diamond size={10} aria-hidden className="mr-0.5 fill-accent text-accent" /> : null}
      </span>

      {/* Compact dots (mobile): one per task, max four. */}
      {info?.tasks.length ? (
        <span aria-hidden className="mt-auto flex flex-wrap gap-0.5 pt-1 sm:hidden">
          {info.tasks.slice(0, 4).map((t) => (
            <span
              key={t.id}
              className={clsx(
                'size-1.5 rounded-full',
                t.completed ? 'bg-good' : dayKey < today ? 'rounded-none bg-warn' : 'border border-accent',
              )}
            />
          ))}
        </span>
      ) : null}

      {/* Titles (tablet and up). */}
      <span aria-hidden className="mt-1 hidden flex-col gap-0.5 sm:flex">
        {visibleTasks.map((t) => {
          const Icon = category(t.category).icon
          return (
            <span
              key={t.id}
              className={clsx(
                'flex items-center gap-1 truncate rounded-[3px] px-1 py-px text-[11px] leading-4',
                t.completed ? 'text-muted line-through' : dayKey < today ? 'bg-warn/12 text-warn' : 'bg-surface-raised text-ink',
              )}
            >
              {t.completed ? (
                <Check size={11} className="shrink-0 text-good" />
              ) : dayKey < today ? (
                <AlertTriangle size={11} className="shrink-0" />
              ) : (
                <Icon size={11} className="shrink-0" />
              )}
              <span className="truncate">{t.title}</span>
            </span>
          )
        })}
        {hidden > 0 && <span className="px-1 text-[11px] text-muted">+{hidden} more</span>}
      </span>
    </button>
  )
}
