import { useMemo, useState } from 'react'
import { ArrowLeft, CalendarPlus, CheckCircle2, Flag, MinusCircle, NotebookPen, Target, Trash2, XCircle } from 'lucide-react'
import clsx from 'clsx'
import { topicLabel, tryGenerate } from '../../lab/engine'
import { pct, summarize, type Tally } from '../../lab/stats'
import { DIFFICULTY_LABEL, type LabResult } from '../../lab/types'
import { formatDay } from '../../lib/dates'
import { useActions, useData } from '../../state/store'
import { useToast } from '../../state/toast'
import type { CategoryId } from '../../types'
import { JournalForm } from '../forms/JournalForm'
import { Button } from '../ui/Button'
import { Card, CardHeader, Eyebrow } from '../ui/Card'
import { ConfirmDialog, Dialog } from '../ui/Dialog'
import { Segmented } from '../ui/Segmented'
import { Diagram } from './Diagram'

const LETTERS = ['A', 'B', 'C', 'D']
const SUBJECT = { math: 'Mathematics', physics: 'Physics', combined: 'Combined' } as const

export function secs(s: number): string {
  const m = Math.floor(s / 60)
  const r = Math.round(s % 60)
  return m ? `${m} min ${String(r).padStart(2, '0')} s` : `${r} s`
}

export function resultCategory(r: LabResult): CategoryId {
  return r.config.subject === 'combined' ? 'mock' : r.config.subject
}

interface Props {
  result: LabResult
  onBack: () => void
  onWeakAreas: () => void
}

export function ResultsView({ result, onBack, onWeakAreas }: Props) {
  const data = useData()
  const actions = useActions()
  const toast = useToast()
  const s = useMemo(() => summarize(result), [result])
  const questions = useMemo(() => result.items.map((it) => tryGenerate(it.key)), [result])
  const [filter, setFilter] = useState<'all' | 'wrong' | 'flagged'>('all')
  const [reflecting, setReflecting] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const subjectName = SUBJECT[result.config.subject]
  const tag = `lab:${result.id}`
  const onCalendar = data.tasks.some((t) => t.notes.includes(tag))

  function addToCalendar() {
    const task = actions.addTask({
      date: result.date,
      title: `Aptitude Lab · ${subjectName} ${s.overall.correct}/${s.overall.total}`,
      category: resultCategory(result),
      plannedMinutes: Math.max(1, Math.round(result.durationSec / 60)),
      notes: `CADET OS-generated practice test: ${Math.round(s.percent)}% correct, ${DIFFICULTY_NAME[result.config.difficulty]}. (${tag})`,
    })
    actions.setTaskCompleted(task.id, true)
    toast({ message: `Added to the calendar on ${formatDay(result.date, 'd MMM')}.` })
  }

  const weakest = [...s.byTopic].sort((a, b) => pct(a[1]) - pct(b[1]))
  const visible = result.items
    .map((it, i) => ({ it, i, q: questions[i] }))
    .filter(({ it }) => (filter === 'wrong' ? it.choice !== it.answer : filter === 'flagged' ? it.flagged : true))

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button variant="ghost" onClick={onBack} className="-ml-3">
          <ArrowLeft size={16} aria-hidden /> Back to Aptitude Lab
        </Button>
        <div className="flex flex-wrap gap-2">
          <Button onClick={addToCalendar} disabled={onCalendar} title={onCalendar ? 'Already on the calendar' : undefined}>
            <CalendarPlus size={16} aria-hidden /> {onCalendar ? 'On the calendar' : 'Add to calendar'}
          </Button>
          <Button onClick={() => setReflecting(true)}>
            <NotebookPen size={16} aria-hidden /> Write reflection
          </Button>
          <Button variant="primary" onClick={onWeakAreas}>
            <Target size={16} aria-hidden /> Practise my weak areas
          </Button>
        </div>
      </div>

      {/* Score */}
      <Card className="p-4 sm:p-5">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div>
            <Eyebrow>
              {subjectName} · {DIFFICULTY_NAME[result.config.difficulty]} · {formatDay(result.date, 'EEE d MMM yyyy')}
            </Eyebrow>
            <p className="num mt-2 text-5xl font-semibold tracking-tight text-ink">
              {s.overall.correct}
              <span className="text-2xl text-muted">/{s.overall.total}</span>
            </p>
            <p className="num mt-1 text-lg text-accent">{Math.round(s.percent)}% correct</p>
          </div>
          <dl className="grid grid-cols-2 gap-x-8 gap-y-3 text-sm sm:grid-cols-5">
            <Stat label="Correct" value={s.overall.correct} icon={<CheckCircle2 size={14} className="text-good" aria-hidden />} />
            <Stat label="Incorrect" value={s.incorrect} icon={<XCircle size={14} className="text-danger" aria-hidden />} />
            <Stat label="Unanswered" value={s.unanswered} icon={<MinusCircle size={14} className="text-muted" aria-hidden />} />
            <Stat label="Total time" value={secs(s.durationSec)} />
            <Stat label="Per question" value={secs(s.avgSec)} />
          </dl>
        </div>
        <p className="mt-4 text-xs text-muted">
          CADET OS-generated practice. Accuracy and pace only — not a sten, not an official ADAPT or PilotSphere score, and not a prediction of selection.
          {result.endReason === 'time' && ' Submitted automatically when time ran out.'}
        </p>
      </Card>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader title="Accuracy by topic" description="Weakest first" />
          <ul className="flex flex-col gap-2.5 px-4 pt-3 pb-4 sm:px-5">
            {weakest.map(([topic, t]) => (
              <BarRow key={topic} label={topicLabel(topic)} t={t} />
            ))}
          </ul>
        </Card>
        <div className="flex flex-col gap-4">
          {s.bySubject.size > 1 && (
            <Card>
              <CardHeader title="By subject" />
              <ul className="flex flex-col gap-2.5 px-4 pt-3 pb-4 sm:px-5">
                {[...s.bySubject].map(([sub, t]) => (
                  <BarRow key={sub} label={SUBJECT[sub]} t={t} />
                ))}
              </ul>
            </Card>
          )}
          <Card>
            <CardHeader title="By difficulty" />
            <ul className="flex flex-col gap-2.5 px-4 pt-3 pb-4 sm:px-5">
              {([1, 2, 3] as const)
                .filter((d) => s.byDifficulty.has(d))
                .map((d) => (
                  <BarRow key={d} label={DIFFICULTY_LABEL[d]} t={s.byDifficulty.get(d)!} />
                ))}
            </ul>
          </Card>
          <Card>
            <CardHeader title="Response times" />
            <div className="grid grid-cols-2 gap-4 px-4 pt-3 pb-4 text-sm sm:px-5">
              <TimeList title="Fastest" list={s.fastest} />
              <TimeList title="Slowest" list={s.slowest} />
            </div>
          </Card>
        </div>
      </div>

      {/* Review */}
      <section aria-labelledby="review-heading">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <h2 id="review-heading" className="text-base font-semibold">
            Question review
          </h2>
          <Segmented
            label="Show questions"
            value={filter}
            onChange={setFilter}
            options={[
              { value: 'all', label: `All ${result.items.length}` },
              { value: 'wrong', label: `Missed ${s.incorrect + s.unanswered}` },
              { value: 'flagged', label: `Flagged ${s.flagged.length}` },
            ]}
          />
        </div>
        {visible.length === 0 ? (
          <p className="rounded-card border border-dashed border-hairline px-4 py-6 text-center text-sm text-muted">Nothing to show here.</p>
        ) : (
          <ol className="flex flex-col gap-2">
            {visible.map(({ it, i, q }) => {
              const ok = it.choice === it.answer
              return (
                <li key={i} id={`review-${i + 1}`}>
                  <details className="group rounded-card border border-hairline bg-surface open:pb-3">
                    <summary className="flex cursor-pointer list-none items-center gap-3 px-4 py-3 [&::-webkit-details-marker]:hidden">
                      {ok ? (
                        <CheckCircle2 size={18} className="shrink-0 text-good" aria-label="Correct" />
                      ) : it.choice === null ? (
                        <MinusCircle size={18} className="shrink-0 text-muted" aria-label="Unanswered" />
                      ) : (
                        <XCircle size={18} className="shrink-0 text-danger" aria-label="Incorrect" />
                      )}
                      <span className="num w-8 shrink-0 text-sm text-muted">{i + 1}</span>
                      <span className="min-w-0 flex-1 truncate text-sm text-ink">{q?.text ?? 'Question no longer available'}</span>
                      {it.flagged && <Flag size={14} className="shrink-0 text-warn" aria-label="Flagged" />}
                      <span className="hidden shrink-0 text-xs text-muted sm:inline">
                        {topicLabel(it.topic)} · {DIFFICULTY_LABEL[it.difficulty]}
                      </span>
                    </summary>
                    {q ? (
                      <div className="flex flex-col gap-3 px-4 text-sm sm:pl-[72px]">
                        <p className="text-base text-ink">{q.text}</p>
                        {q.given && <p className="text-muted">Given: {q.given}</p>}
                        {q.diagram && (
                          <div className="max-w-xl">
                            <Diagram data={q.diagram} />
                          </div>
                        )}
                        <ul className="grid gap-1.5 sm:grid-cols-2">
                          {q.choices.map((c, k) => (
                            <li
                              key={k}
                              className={clsx(
                                'flex items-center gap-2 rounded-control border px-3 py-2',
                                k === it.answer ? 'border-good bg-good/10' : k === it.choice ? 'border-danger bg-danger/10' : 'border-hairline',
                              )}
                            >
                              <span className="num text-muted">{LETTERS[k]}</span>
                              <span className="text-ink">{c}</span>
                              {k === it.answer && <span className="ml-auto text-xs text-good">Correct</span>}
                              {k === it.choice && k !== it.answer && <span className="ml-auto text-xs text-danger">Your answer</span>}
                            </li>
                          ))}
                        </ul>
                        <p className="text-muted">
                          Your answer: <span className="text-ink">{it.choice === null ? 'none' : LETTERS[it.choice]}</span> · Time:{' '}
                          <span className="num text-ink">{secs(it.timeMs / 1000)}</span> (guide {secs(it.expected)}) · {topicLabel(it.topic)} ·{' '}
                          {DIFFICULTY_LABEL[it.difficulty]}
                          {it.checked && ' · answer was checked during practice'}
                        </p>
                        {q.formula && <p className="num text-accent">{q.formula}</p>}
                        <ol className="list-decimal space-y-1 pl-5 text-ink">
                          {q.explanation.map((step, n) => (
                            <li key={n}>{step}</li>
                          ))}
                        </ol>
                      </div>
                    ) : (
                      <p className="px-4 text-sm text-muted">This question was made by an older version of the generator and can't be shown.</p>
                    )}
                  </details>
                </li>
              )
            })}
          </ol>
        )}
      </section>

      <div className="flex justify-end">
        <Button variant="danger" onClick={() => setDeleting(true)}>
          <Trash2 size={16} aria-hidden /> Delete this result
        </Button>
      </div>

      <Dialog open={reflecting} onClose={() => setReflecting(false)} title="Reflect on this test" size="lg">
        <JournalForm
          defaultCategory={resultCategory(result)}
          defaultDate={result.date}
          prefill={{
            wentWell: `Aptitude Lab ${subjectName}: ${s.overall.correct}/${s.overall.total} (${Math.round(s.percent)}%).`,
            difficult: weakest
              .slice(0, 3)
              .filter(([, t]) => pct(t) < 100)
              .map(([topic, t]) => `${topicLabel(topic)} ${Math.round(pct(t))}%`)
              .join(', '),
          }}
          onDone={() => setReflecting(false)}
          onCancel={() => setReflecting(false)}
        />
      </Dialog>
      <ConfirmDialog
        open={deleting}
        title="Delete this result?"
        message="It will disappear from your Aptitude Lab history and Performance. This can't be undone."
        confirmLabel="Delete result"
        onCancel={() => setDeleting(false)}
        onConfirm={() => {
          actions.deleteLabResult(result.id)
          setDeleting(false)
          toast({ message: 'Result deleted.' })
          onBack()
        }}
      />
    </div>
  )
}

export const DIFFICULTY_NAME = { basic: 'Basic', intermediate: 'Intermediate', advanced: 'Advanced', adaptive: 'Adaptive mixed' } as const

function Stat({ label, value, icon }: { label: string; value: number | string; icon?: React.ReactNode }) {
  return (
    <div>
      <dt className="flex items-center gap-1.5 text-xs text-muted">
        {icon}
        {label}
      </dt>
      <dd className="num mt-0.5 text-ink">{value}</dd>
    </div>
  )
}

function BarRow({ label, t }: { label: string; t: Tally }) {
  const p = pct(t)
  return (
    <li className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1 text-sm">
      <span className="truncate text-ink">{label}</span>
      <span className="num text-muted">
        {t.correct}/{t.total} · <span className="text-ink">{Math.round(p)}%</span>
      </span>
      <div className="col-span-2 h-1.5 overflow-hidden rounded-full bg-well" aria-hidden>
        <div className={clsx('h-full rounded-full', p >= 80 ? 'bg-good' : p >= 50 ? 'bg-accent' : 'bg-warn')} style={{ width: `${Math.max(p, 2)}%` }} />
      </div>
    </li>
  )
}

function TimeList({ title, list }: { title: string; list: { index: number; ms: number }[] }) {
  return (
    <div>
      <p className="text-xs text-muted">{title}</p>
      {list.length ? (
        <ul className="mt-1 space-y-0.5">
          {list.map((x) => (
            <li key={x.index}>
              <a href={`#review-${x.index + 1}`} onClick={(e) => openReview(e, x.index)} className="num text-ink underline-offset-2 hover:underline">
                Q{x.index + 1}
              </a>{' '}
              <span className="num text-muted">{secs(x.ms / 1000)}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-1 text-muted">—</p>
      )}
    </div>
  )
}

/** Jump to a reviewed question without touching the hash route. */
function openReview(e: React.MouseEvent, index: number) {
  e.preventDefault()
  const el = document.getElementById(`review-${index + 1}`)
  const details = el?.querySelector('details')
  if (details) details.open = true
  el?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  el?.querySelector('summary')?.focus()
}
