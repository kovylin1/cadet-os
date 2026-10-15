import { ArrowRight, FlaskConical } from 'lucide-react'
import clsx from 'clsx'
import { topicLabel } from '../../lab/topics'
import { historyPoints, mean, topicMastery } from '../../lab/stats'
import type { LabResult, Subject, TestSubject } from '../../lab/types'
import { formatDay } from '../../lib/dates'
import { studyHref } from '../../lib/routes'
import { Card } from '../ui/Card'
import { CategoryChip } from '../ui/Misc'
import { LabTrend } from './LabTrend'

const SUBJECT_NAME: Record<TestSubject, string> = { math: 'Mathematics', physics: 'Physics', combined: 'Combined' }
const LEVEL: Record<string, string> = { basic: 'Basic', intermediate: 'Intermediate', advanced: 'Advanced', adaptive: 'Adaptive' }

/*
 * Aptitude Lab results on the Performance page. Shown as their own panel with
 * their own label, never merged into the recorded-results scales above.
 */
export function LabPanel({ results, subjects }: { results: LabResult[]; subjects: Subject[] }) {
  const single = subjects.length === 1
  return (
    <section aria-labelledby="lab-heading">
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="lab-heading" className="flex items-center gap-2 text-base font-semibold">
          <FlaskConical size={18} aria-hidden className="text-accent" />
          Aptitude Lab
        </h2>
        <p className="text-xs text-muted">CADET OS-generated practice · accuracy % · separate scale from recorded results</p>
      </div>
      <div className={clsx('grid gap-3', !single && 'md:grid-cols-2')}>
        {subjects.map((s) => (
          <SubjectCard key={s} subject={s} results={results} detailed={single} />
        ))}
      </div>
    </section>
  )
}

function SubjectCard({ subject, results, detailed }: { subject: Subject; results: LabResult[]; detailed: boolean }) {
  const points = historyPoints(results, subject)
  const acc = points.map((p) => p.accuracy)
  // Newest first; combined tests count only their questions in this subject.
  const recent = [...points].reverse().slice(0, detailed ? 8 : 3)
  const byId = new Map(results.map((r) => [r.id, r]))
  const weakest = topicMastery(results, subject)
    .sort((a, b) => a.accuracy - b.accuracy)
    .slice(0, detailed ? 5 : 3)

  return (
    <Card className="pb-2">
      <div className="flex items-start justify-between gap-3 px-4 pt-4">
        <div>
          <CategoryChip id={subject} />
          <p className="mt-2 text-xs text-muted">
            {points.length
              ? `${points.length} ${points.length === 1 ? 'test' : 'tests'} · avg ${Math.round(mean(acc))}% · ${Math.round(mean(points.map((p) => p.secPerQ)))} s/question`
              : 'No generated tests yet'}
          </p>
        </div>
        {points.length > 0 && (
          <div className="text-right">
            <p className="num text-xl font-semibold text-ink">{Math.round(acc[acc.length - 1])}%</p>
            <p className="text-xs text-muted">latest · best {Math.round(Math.max(...acc))}%</p>
          </div>
        )}
      </div>

      {points.length > 1 ? (
        <LabTrend points={points} height={detailed ? 200 : 150} />
      ) : (
        <p className="px-4 py-5 text-sm text-muted">
          {points.length ? 'A trend line appears after the next test.' : `Take a ${SUBJECT_NAME[subject].toLowerCase()} or combined test in Study to see it here.`}
        </p>
      )}

      {points.length > 0 && (
        <div className={clsx('grid gap-4 px-4 pt-2 pb-3', detailed && 'lg:grid-cols-2')}>
          <div className="min-w-0">
            <h3 className="mb-1 text-xs font-medium tracking-wide text-muted uppercase">Recent tests</h3>
            <ul className="divide-y divide-hairline">
              {recent.map((p) => {
                const r = byId.get(p.id)
                const correct = Math.round((p.accuracy / 100) * p.count)
                return (
                  <li key={p.id}>
                    <a
                      href={`${studyHref(subject)}?result=${p.id}`}
                      className="-mx-2 flex items-center gap-3 rounded-control px-2 py-2 text-sm hover:bg-surface-raised"
                    >
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-ink">
                          {r ? `${SUBJECT_NAME[r.config.subject]} · ${LEVEL[r.config.difficulty] ?? r.config.difficulty}` : SUBJECT_NAME[subject]}
                        </span>
                        <span className="block text-xs text-muted">
                          {formatDay(p.date, 'EEE d MMM')}
                          {r && (r.config.timeMode === 'untimed' ? ' · untimed' : ` · ${r.config.minutes} min`)}
                          {r?.config.weights && ' · weak areas'}
                        </span>
                      </span>
                      <span className="num text-muted">
                        {correct}/{p.count}
                      </span>
                      <span className="num w-11 text-right text-ink">{Math.round(p.accuracy)}%</span>
                    </a>
                  </li>
                )
              })}
            </ul>
          </div>
          <div className="min-w-0">
            <h3 className="mb-2 text-xs font-medium tracking-wide text-muted uppercase">Weakest topics</h3>
            <ul className="flex flex-col gap-2">
              {weakest.map((m) => (
                <li key={m.topic} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1 text-sm">
                  <span className="truncate text-ink">{topicLabel(m.topic)}</span>
                  <span className="num text-xs text-muted">
                    <span className="text-ink">{Math.round(m.accuracy)}%</span> · {m.seen} q
                  </span>
                  <div className="col-span-2 h-1.5 overflow-hidden rounded-full bg-well" aria-hidden>
                    <div
                      className={clsx('h-full rounded-full', m.accuracy >= 80 ? 'bg-good' : m.accuracy >= 50 ? 'bg-accent' : 'bg-warn')}
                      style={{ width: `${Math.max(m.accuracy, 2)}%` }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      <div className="px-4 pb-2">
        <a href={studyHref(subject)} className="inline-flex items-center gap-1 text-sm text-accent hover:underline">
          Open in Aptitude Lab <ArrowRight size={14} aria-hidden />
        </a>
      </div>
    </Card>
  )
}
