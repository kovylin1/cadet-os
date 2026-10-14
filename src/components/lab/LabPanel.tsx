import { ArrowRight, FlaskConical } from 'lucide-react'
import { historyPoints, mean } from '../../lab/stats'
import type { LabResult, Subject } from '../../lab/types'
import { studyHref } from '../../lib/routes'
import { Card } from '../ui/Card'
import { CategoryChip } from '../ui/Misc'
import { LabTrend } from './LabTrend'

/*
 * Aptitude Lab results on the Performance page. Shown as their own panel with
 * their own label, never merged into the recorded-results scales above.
 */
export function LabPanel({ results, subjects }: { results: LabResult[]; subjects: Subject[] }) {
  const rows = subjects.map((s) => ({ s, points: historyPoints(results, s) }))
  return (
    <section aria-labelledby="lab-heading">
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="lab-heading" className="flex items-center gap-2 text-base font-semibold">
          <FlaskConical size={18} aria-hidden className="text-accent" />
          Aptitude Lab
        </h2>
        <p className="text-xs text-muted">CADET OS-generated practice · accuracy % · separate scale from recorded results</p>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        {rows.map(({ s, points }) => {
          const acc = points.map((p) => p.accuracy)
          return (
            <Card key={s} className="pb-2">
              <div className="flex items-start justify-between gap-3 px-4 pt-4">
                <div>
                  <CategoryChip id={s} />
                  <p className="mt-2 text-xs text-muted">
                    {points.length ? `${points.length} ${points.length === 1 ? 'test' : 'tests'} · avg ${Math.round(mean(acc))}% · ${Math.round(mean(points.map((p) => p.secPerQ)))} s/question` : 'No generated tests yet'}
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
                <LabTrend points={points} height={150} />
              ) : (
                <p className="px-4 py-5 text-sm text-muted">{points.length ? 'A trend line appears after the next test.' : 'Take a generated test to start a trend.'}</p>
              )}
              <div className="px-4 pb-2">
                <a href={studyHref(s)} className="inline-flex items-center gap-1 text-sm text-accent hover:underline">
                  Open in Aptitude Lab <ArrowRight size={14} aria-hidden />
                </a>
              </div>
            </Card>
          )
        })}
      </div>
    </section>
  )
}
