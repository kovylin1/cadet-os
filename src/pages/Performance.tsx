import { useEffect, useMemo, useState, type ReactNode } from 'react'
import {
  ArrowDownRight,
  ArrowUpRight,
  ClipboardList,
  FlaskConical,
  HeartPulse,
  Info,
  Minus,
  Pencil,
  Plus,
  Trash2,
} from 'lucide-react'
import clsx from 'clsx'
import type { Attempt, CategoryId, Session } from '../types'
import { SCORABLE_CATEGORIES, category } from '../lib/categories'
import { formatDay } from '../lib/dates'
import {
  MIN_TREND_POINTS,
  availableScales,
  formatDelta,
  formatValue,
  primaryScale,
  scaleInfo,
  scaleKeysOf,
  scaleStats,
  sortAttempts,
  valueOn,
  type ScaleKey,
  type ScaleStats,
} from '../lib/metrics'
import { useActions, useData } from '../state/store'
import { useToast } from '../state/toast'
import { PageHeader } from '../components/layout/AppShell'
import { AttemptDialog } from '../components/forms/AttemptDialog'
import { SessionDialog } from '../components/forms/SessionDialog'
import { ScoreChart } from '../components/charts/ScoreChart'
import { EnergyChart } from '../components/charts/EnergyChart'
import { FatigueScatter, fatigueRows } from '../components/charts/FatigueScatter'
import { Button } from '../components/ui/Button'
import { Card, CardHeader, Eyebrow } from '../components/ui/Card'
import { ConfirmDialog } from '../components/ui/Dialog'
import { CategoryChip, EmptyState, Note } from '../components/ui/Misc'
import { Segmented } from '../components/ui/Segmented'
import { LabPanel } from '../components/lab/LabPanel'

type Filter = 'all' | CategoryId

function filterFromHash(): Filter {
  const match = window.location.hash.match(/cat=([a-z]+)/)
  const id = match?.[1]
  return SCORABLE_CATEGORIES.some((c) => c.id === id) ? (id as CategoryId) : 'all'
}

export function Performance() {
  const data = useData()
  const [filter, setFilter] = useState<Filter>(filterFromHash)
  const [scaleChoice, setScaleChoice] = useState<Partial<Record<CategoryId, ScaleKey>>>({})
  const [recording, setRecording] = useState(false)
  const [editing, setEditing] = useState<Attempt | null>(null)

  useEffect(() => {
    const onHash = () => setFilter(filterFromHash())
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])

  function changeFilter(f: Filter) {
    setFilter(f)
    // Keep the URL shareable/back-button friendly without triggering a re-route.
    window.history.replaceState(null, '', f === 'all' ? '#/performance' : `#/performance?cat=${f}`)
  }

  const attempts = useMemo(() => sortAttempts(data.attempts), [data.attempts])
  const inCategory = filter === 'all' ? attempts : attempts.filter((a) => a.category === filter)
  const scales = availableScales(inCategory)
  const latest = inCategory[inCategory.length - 1]
  const defaultScale = latest ? primaryScale(latest) : null
  const chosen = filter !== 'all' ? scaleChoice[filter] : undefined
  const scale = chosen && scales.includes(chosen) ? chosen : defaultScale

  return (
    <>
      <PageHeader
        title="Performance"
        description="Every scale is tracked on its own. Percentages, stens, scaled and raw scores are never mixed."
        actions={
          <Button variant="primary" onClick={() => setRecording(true)}>
            <Plus size={16} aria-hidden /> Record result
          </Button>
        }
      />

      <div className="-mx-4 mb-6 overflow-x-auto px-4 sm:mx-0 sm:px-0">
        <Segmented
          label="Assessment category"
          value={filter}
          onChange={changeFilter}
          options={[{ value: 'all', label: 'All' }, ...SCORABLE_CATEGORIES.map((c) => ({ value: c.id as Filter, label: c.short }))]}
          className="[&>div]:flex-nowrap sm:[&>div]:flex-wrap"
        />
      </div>

      <div className="flex flex-col gap-6">
        {filter === 'all' ? (
          <AllCategories attempts={attempts} onRecord={() => setRecording(true)} onPick={changeFilter} />
        ) : (
          <CategoryDetail
            id={filter}
            attempts={inCategory}
            scales={scales}
            scale={scale}
            onScale={(k) => setScaleChoice((m) => ({ ...m, [filter]: k }))}
            onRecord={() => setRecording(true)}
          />
        )}

        <AttemptTable attempts={inCategory} onEdit={setEditing} showCategory={filter === 'all'} />

        {(filter === 'all' || filter === 'math' || filter === 'physics') && (
          <LabPanel results={data.lab} subjects={filter === 'all' ? ['math', 'physics'] : [filter]} />
        )}

        <FatigueSection
          sessions={data.sessions}
          attempts={inCategory}
          scale={filter === 'all' ? null : scale}
          categoryLabel={filter === 'all' ? null : category(filter).short}
        />
      </div>

      <AttemptDialog
        open={recording || editing != null}
        attempt={editing}
        defaultCategory={filter === 'all' ? undefined : filter}
        onClose={() => {
          setRecording(false)
          setEditing(null)
        }}
      />
    </>
  )
}

/* ---------- All categories: small multiples + first vs latest ---------- */

function AllCategories({ attempts, onRecord, onPick }: { attempts: Attempt[]; onRecord: () => void; onPick: (f: Filter) => void }) {
  const groups = SCORABLE_CATEGORIES.map((c) => {
    const list = attempts.filter((a) => a.category === c.id)
    const latest = list[list.length - 1]
    const scale = latest ? primaryScale(latest) : null
    return { c, list, scale, stats: scale ? scaleStats(list, scale) : null }
  })
  const withData = groups.filter((g) => g.stats)
  const without = groups.filter((g) => !g.stats)

  if (!withData.length) {
    return (
      <EmptyState
        icon={ClipboardList}
        title="No results recorded yet"
        action={
          <Button variant="primary" onClick={onRecord}>
            <Plus size={16} aria-hidden /> Record your first result
          </Button>
        }
      >
        Log a practice test to start tracking progress per category.
      </EmptyState>
    )
  }

  const comparisons = withData.flatMap(({ c, list }) =>
    availableScales(list)
      .map((k) => ({ c, k, s: scaleStats(list, k)! }))
      .filter((r) => r.s.count > 1),
  )

  return (
    <>
      <section aria-labelledby="trends-heading">
        <h2 id="trends-heading" className="mb-3 text-base font-semibold">
          Category trends
        </h2>
        <div className="grid gap-3 md:grid-cols-2">
          {withData.map(({ c, stats }) => (
            <Card key={c.id} className="pb-2">
              <div className="flex items-start justify-between gap-3 px-4 pt-4">
                <div>
                  <CategoryChip id={c.id} />
                  <p className="mt-2 text-xs text-muted">{scaleInfo(stats!.scale).label}</p>
                </div>
                <div className="text-right">
                  <p className="num text-xl font-semibold text-ink">{formatValue(stats!.latest.value, stats!.scale).split(' ')[0]}</p>
                  <p className="text-xs text-muted">
                    latest · {stats!.count} {stats!.count === 1 ? 'attempt' : 'attempts'}
                  </p>
                </div>
              </div>
              {stats!.count > 1 ? (
                <ScoreChart stats={stats!} height={150} />
              ) : (
                <p className="px-4 py-6 text-sm text-muted">One attempt so far — a trend line appears after the next one.</p>
              )}
              <div className="px-4 pb-2">
                <button
                  type="button"
                  onClick={() => onPick(c.id)}
                  className="rounded-control text-sm text-accent underline-offset-2 hover:underline"
                >
                  Open {c.short} details
                </button>
              </div>
            </Card>
          ))}
        </div>
        {without.length > 0 && (
          <p className="mt-3 text-sm text-muted">
            No results yet: {without.map((g) => g.c.short).join(', ')}.{' '}
            <button type="button" onClick={onRecord} className="rounded-control text-accent underline underline-offset-2">
              Record one
            </button>
          </p>
        )}
      </section>

      {comparisons.length > 0 && (
        <Card aria-labelledby="compare-heading">
          <CardHeader id="compare-heading" title="First vs latest attempt" description="Compared only within the same scale." />
          <div className="overflow-x-auto px-4 pt-2 pb-4 sm:px-5">
            <table className="w-full min-w-[480px] text-sm">
              <thead>
                <tr className="border-b border-hairline text-left text-xs text-muted">
                  <th scope="col" className="py-2 pr-3 font-medium">Category</th>
                  <th scope="col" className="py-2 pr-3 font-medium">Scale</th>
                  <th scope="col" className="py-2 pr-3 text-right font-medium">First</th>
                  <th scope="col" className="py-2 pr-3 text-right font-medium">Latest</th>
                  <th scope="col" className="py-2 text-right font-medium">Change</th>
                </tr>
              </thead>
              <tbody>
                {comparisons.map(({ c, k, s }) => (
                  <tr key={`${c.id}-${k}`} className="border-b border-hairline last:border-0">
                    <th scope="row" className="py-2.5 pr-3 text-left font-normal text-ink">{c.short}</th>
                    <td className="py-2.5 pr-3 text-muted">{scaleInfo(k).label}</td>
                    <td className="num py-2.5 pr-3 text-right text-ink">{formatValue(s.first.value, k).split(' ')[0]}</td>
                    <td className="num py-2.5 pr-3 text-right text-ink">{formatValue(s.latest.value, k).split(' ')[0]}</td>
                    <td className="py-2.5 text-right">
                      <Delta value={s.firstToLatest!} scale={k} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </>
  )
}

/* ---------- Single category ---------- */

interface CategoryDetailProps {
  id: CategoryId
  attempts: Attempt[]
  scales: ScaleKey[]
  scale: ScaleKey | null
  onScale: (k: ScaleKey) => void
  onRecord: () => void
}

function CategoryDetail({ id, attempts, scales, scale, onScale, onRecord }: CategoryDetailProps) {
  const meta = category(id)
  const stats = scale ? scaleStats(attempts, scale) : null

  if (!stats || !scale) {
    return (
      <EmptyState
        icon={meta.icon}
        title={`No ${meta.label} results yet`}
        action={
          <Button variant="primary" onClick={onRecord}>
            <Plus size={16} aria-hidden /> Record a {meta.short} result
          </Button>
        }
      >
        {id === 'fast'
          ? 'FAST stays empty until you have a real score to enter — nothing is estimated.'
          : 'Once you log a practice result, the latest, best and trend appear here.'}
      </EmptyState>
    )
  }

  return (
    <Card aria-labelledby="detail-heading">
      <CardHeader
        id="detail-heading"
        title={meta.label}
        description={`${stats.count} ${stats.count === 1 ? 'attempt' : 'attempts'} on this scale`}
        actions={
          scales.length > 1 ? (
            <Segmented
              label="Scoring scale"
              value={scale}
              onChange={onScale}
              options={scales.map((k) => ({ value: k, label: shortScale(k) }))}
            />
          ) : (
            <span className="text-sm text-muted">{scaleInfo(scale).label}</span>
          )
        }
      />
      <dl className="grid grid-cols-2 gap-px overflow-hidden border-y border-hairline bg-hairline mt-4 sm:grid-cols-3 lg:grid-cols-6">
        <Stat label="Latest" value={formatValue(stats.latest.value, scale)} sub={formatDay(stats.latest.attempt.date, 'd MMM')} />
        <Stat label="Personal best" value={formatValue(stats.best.value, scale)} sub={formatDay(stats.best.attempt.date, 'd MMM')} />
        <Stat label="Average" value={formatValue(Number(stats.average.toFixed(1)), scale)} sub={`of ${stats.count}`} />
        <Stat label="vs previous" value={stats.changeFromPrevious == null ? '—' : <Delta value={stats.changeFromPrevious} scale={scale} />} sub={stats.changeFromPrevious == null ? 'Needs 2 attempts' : undefined} />
        <Stat label="First → latest" value={stats.firstToLatest == null ? '—' : <Delta value={stats.firstToLatest} scale={scale} />} />
        <Stat label="Trend" value={<TrendLabel stats={stats} />} sub={stats.trend ? `over ${stats.count} attempts` : `Needs ${MIN_TREND_POINTS}+ attempts`} />
      </dl>
      <div className="px-2 pt-4 pb-3 sm:px-3">
        {stats.count > 1 ? (
          <ScoreChart stats={stats} />
        ) : (
          <p className="px-2 py-8 text-center text-sm text-muted">The chart appears after your second attempt on this scale.</p>
        )}
      </div>
    </Card>
  )
}

function shortScale(k: ScaleKey): string {
  if (k === 'percentage') return '%'
  if (k === 'sten') return 'Sten'
  if (k === 'scaled') return 'Scaled'
  return scaleInfo(k).label.replace('Raw · ', '')
}

function Stat({ label, value, sub }: { label: string; value: ReactNode; sub?: string }) {
  return (
    <div className="bg-surface px-4 py-3">
      <dt>
        <Eyebrow>{label}</Eyebrow>
      </dt>
      <dd className="num mt-1 text-lg font-semibold text-ink">{value}</dd>
      {sub && <dd className="text-xs text-muted">{sub}</dd>}
    </div>
  )
}

function Delta({ value, scale }: { value: number; scale: ScaleKey }) {
  const Icon = value > 0 ? ArrowUpRight : value < 0 ? ArrowDownRight : Minus
  return (
    <span className={clsx('num inline-flex items-center gap-1', value > 0 ? 'text-good' : value < 0 ? 'text-warn' : 'text-muted')}>
      <Icon size={15} aria-hidden />
      {formatDelta(value, scale)}
    </span>
  )
}

function TrendLabel({ stats }: { stats: ScaleStats }) {
  if (!stats.trend) return <span className="text-muted">—</span>
  const map = {
    improving: { Icon: ArrowUpRight, text: 'Improving', cls: 'text-good' },
    declining: { Icon: ArrowDownRight, text: 'Declining', cls: 'text-warn' },
    steady: { Icon: Minus, text: 'Steady', cls: 'text-ink' },
  }[stats.trend]
  return (
    <span className={clsx('inline-flex items-center gap-1 font-sans', map.cls)}>
      <map.Icon size={16} aria-hidden />
      {map.text}
    </span>
  )
}

/* ---------- Attempts list ---------- */

function AttemptTable({ attempts, onEdit, showCategory }: { attempts: Attempt[]; onEdit: (a: Attempt) => void; showCategory: boolean }) {
  const actions = useActions()
  const toast = useToast()
  const [deleting, setDeleting] = useState<Attempt | null>(null)
  const rows = [...attempts].reverse()

  if (!rows.length) return null

  return (
    <Card aria-labelledby="attempts-heading">
      <CardHeader id="attempts-heading" title="Recorded attempts" description="Newest first. Expand an entry for notes and lessons." />
      <ul className="mt-3 divide-y divide-hairline border-t border-hairline">
        {rows.map((a) => (
          <li key={a.id} className="px-4 py-3 sm:px-5">
            <div className="flex flex-wrap items-start gap-x-4 gap-y-2">
              <div className="min-w-0 flex-1 basis-60">
                <p className="font-medium text-ink">{a.name}</p>
                <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
                  <span>{formatDay(a.date)}</span>
                  {showCategory && <CategoryChip id={a.category} short />}
                  {a.durationMinutes != null && <span className="num">{a.durationMinutes} min</span>}
                  {a.fatigue != null && <span>Fatigue <span className="num">{a.fatigue}/5</span></span>}
                  {a.difficulty != null && <span>Difficulty <span className="num">{a.difficulty}/5</span></span>}
                </p>
              </div>
              <ul aria-label="Scores" className="flex flex-wrap gap-1.5">
                {scaleKeysOf(a).map((k) => (
                  <li key={k} className="rounded-control border border-hairline bg-well px-2 py-1 text-xs">
                    <span className="text-muted">{shortScale(k)} </span>
                    <span className="num text-ink">{formatValue(valueOn(a, k)!, k).split(' ')[0]}</span>
                  </li>
                ))}
              </ul>
              <div className="flex gap-1">
                <Button variant="ghost" size="icon-sm" aria-label={`Edit ${a.name}, ${formatDay(a.date)}`} onClick={() => onEdit(a)}>
                  <Pencil size={16} aria-hidden />
                </Button>
                <Button variant="ghost" size="icon-sm" aria-label={`Delete ${a.name}, ${formatDay(a.date)}`} onClick={() => setDeleting(a)}>
                  <Trash2 size={16} aria-hidden />
                </Button>
              </div>
            </div>
            {(a.notes || a.lessons) && (
              <details className="group mt-2">
                <summary className="inline-flex cursor-pointer list-none items-center gap-1 rounded-control text-sm text-accent hover:underline [&::-webkit-details-marker]:hidden">
                  <span className="group-open:hidden">Show notes</span>
                  <span className="hidden group-open:inline">Hide notes</span>
                </summary>
                <div className="mt-2 grid gap-3 text-sm sm:grid-cols-2">
                  {a.notes && (
                    <div>
                      <p className="text-xs font-medium text-muted">Notes and mistakes</p>
                      <p className="mt-0.5 whitespace-pre-line text-ink">{a.notes}</p>
                    </div>
                  )}
                  {a.lessons && (
                    <div>
                      <p className="text-xs font-medium text-muted">Lessons learned</p>
                      <p className="mt-0.5 whitespace-pre-line text-ink">{a.lessons}</p>
                    </div>
                  )}
                </div>
              </details>
            )}
          </li>
        ))}
      </ul>
      <ConfirmDialog
        open={deleting != null}
        title="Delete this result?"
        message={<>“{deleting?.name}” from {deleting ? formatDay(deleting.date) : ''} will be removed and the charts recalculated. This can’t be undone.</>}
        confirmLabel="Delete result"
        onCancel={() => setDeleting(null)}
        onConfirm={() => {
          if (deleting) {
            actions.deleteAttempt(deleting.id)
            toast({ message: 'Result deleted.', tone: 'info' })
          }
          setDeleting(null)
        }}
      />
    </Card>
  )
}

/* ---------- Fatigue & performance ---------- */

function pearson(xs: number[], ys: number[]): number | null {
  const n = xs.length
  const mx = xs.reduce((s, v) => s + v, 0) / n
  const my = ys.reduce((s, v) => s + v, 0) / n
  let num = 0
  let dx = 0
  let dy = 0
  for (let i = 0; i < n; i++) {
    num += (xs[i] - mx) * (ys[i] - my)
    dx += (xs[i] - mx) ** 2
    dy += (ys[i] - my) ** 2
  }
  return dx === 0 || dy === 0 ? null : num / Math.sqrt(dx * dy)
}

const MIN_SCATTER = 3
const MIN_CORRELATION = 5

function FatigueSection({
  sessions,
  attempts,
  scale,
  categoryLabel,
}: {
  sessions: Session[]
  attempts: Attempt[]
  scale: ScaleKey | null
  categoryLabel: string | null
}) {
  const [logging, setLogging] = useState(false)
  const rows = scale ? fatigueRows(attempts, scale) : []
  const r = rows.length >= MIN_CORRELATION ? pearson(rows.map((x) => x.fatigue), rows.map((x) => x.value)) : null

  return (
    <Card aria-labelledby="fatigue-heading">
      <CardHeader
        id="fatigue-heading"
        title="Fatigue & focus"
        description="How energy and concentration move with your training."
        actions={
          <Button size="sm" onClick={() => setLogging(true)}>
            <HeartPulse size={16} aria-hidden /> Log check-in
          </Button>
        }
      />
      <div className="flex flex-col gap-6 px-4 pt-4 pb-5 sm:px-5">
        <Note icon={Info}>
          These views are exploratory. With a small personal dataset, a pattern can easily be chance or have another cause
          (sleep, time of day, test type). Use them to ask better questions, not as proof.
        </Note>

        <div className="grid gap-6 lg:grid-cols-2">
          <div>
            <h3 className="mb-2 text-sm font-medium">Energy and concentration per session</h3>
            {sessions.length >= 2 ? (
              <EnergyChart sessions={sessions} />
            ) : (
              <EmptyState icon={HeartPulse} title={sessions.length ? 'One check-in so far' : 'No check-ins yet'}>
                After a session, rate your energy before and after and your concentration. The chart appears from two
                check-ins.
              </EmptyState>
            )}
          </div>
          <div>
            <h3 className="mb-2 text-sm font-medium">
              Fatigue vs score{categoryLabel && scale ? ` · ${categoryLabel}, ${shortScale(scale)}` : ''}
            </h3>
            {!scale ? (
              <EmptyState icon={FlaskConical} title="Pick a category">
                Fatigue is compared with scores one category and one scale at a time.
              </EmptyState>
            ) : rows.length >= MIN_SCATTER ? (
              <>
                <FatigueScatter rows={rows} scale={scale} />
                <p className="mt-2 text-sm text-muted">
                  {r == null
                    ? `${rows.length} attempts with a fatigue rating. A correlation figure appears from ${MIN_CORRELATION}.`
                    : `Correlation r = ${r.toFixed(2)} across ${rows.length} attempts — ${describeR(r)}. Exploratory only.`}
                </p>
              </>
            ) : (
              <EmptyState icon={FlaskConical} title="Not enough data yet">
                Rate mental fatigue when recording results. The plot appears from {MIN_SCATTER} rated attempts on this
                scale ({rows.length} so far).
              </EmptyState>
            )}
          </div>
        </div>
      </div>
      <SessionDialog open={logging} onClose={() => setLogging(false)} />
    </Card>
  )
}

function describeR(r: number): string {
  const a = Math.abs(r)
  const strength = a < 0.2 ? 'no clear relationship' : a < 0.5 ? 'a weak' : a < 0.8 ? 'a moderate' : 'a strong'
  if (a < 0.2) return strength
  return `${strength} ${r < 0 ? 'negative (more fatigue, lower scores)' : 'positive'} association`
}
