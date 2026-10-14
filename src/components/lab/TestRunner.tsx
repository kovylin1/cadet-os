import { useCallback, useEffect, useRef, useState } from 'react'
import { ArrowLeft, ArrowRight, Calculator as CalcIcon, CheckCircle2, Clock, Flag, Info, LogOut, XCircle } from 'lucide-react'
import clsx from 'clsx'
import { topicLabel } from '../../lab/engine'
import { saveActive, type ActiveTest } from '../../lab/session'
import { DIFFICULTY_LABEL, type Question } from '../../lab/types'
import { Button } from '../ui/Button'
import { Dialog } from '../ui/Dialog'
import { Calculator } from './Calculator'
import { Diagram } from './Diagram'

interface Props {
  test: ActiveTest
  questions: Question[]
  onChange: (test: ActiveTest) => void
  onFinish: (test: ActiveTest, reason: 'submitted' | 'time') => void
  onExit: () => void
}

const LETTERS = ['A', 'B', 'C', 'D'] as const
const SUBJECT = { math: 'Mathematics', physics: 'Physics' } as const

function formatClock(ms: number) {
  const s = Math.max(0, Math.ceil(ms / 1000))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60
  return `${h ? `${h}:` : ''}${String(m).padStart(h ? 2 : 1, '0')}:${String(sec).padStart(2, '0')}`
}

/**
 * Exam screen. Covers the app shell so nothing distracts, saves after every
 * change, and keeps time against an absolute deadline so a reload doesn't
 * reset the clock.
 */
export function TestRunner({ test, questions, onChange, onFinish, onExit }: Props) {
  const [now, setNow] = useState(() => Date.now())
  const [confirm, setConfirm] = useState(false)
  const [showCalc, setShowCalc] = useState(test.config.calculator)
  const [announce, setAnnounce] = useState('')
  const segmentStart = useRef(Date.now())
  const testRef = useRef(test)
  testRef.current = test
  const finished = useRef(false)
  const headingRef = useRef<HTMLHeadingElement>(null)

  const i = test.current
  const q = questions[i]
  const practice = test.config.timeMode === 'untimed'
  const remaining = test.deadline != null ? test.deadline - now : null

  /** Add the time spent on the current question since the last commit. */
  const withTime = useCallback((t: ActiveTest): ActiveTest => {
    const elapsed = Date.now() - segmentStart.current
    segmentStart.current = Date.now()
    const timeMs = [...t.timeMs]
    timeMs[t.current] += elapsed
    return { ...t, timeMs }
  }, [])

  const update = useCallback(
    (fn: (t: ActiveTest) => ActiveTest) => {
      const next = fn(testRef.current)
      testRef.current = next
      saveActive(next)
      onChange(next)
    },
    [onChange],
  )

  const finish = useCallback(
    (reason: 'submitted' | 'time') => {
      if (finished.current) return
      finished.current = true
      onFinish(withTime(testRef.current), reason)
    },
    [onFinish, withTime],
  )

  // Clock tick; also flush time spent every 10 s so a crash loses little.
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000)
    const flush = window.setInterval(() => update(withTime), 10000)
    const onHide = () => document.visibilityState === 'hidden' && update(withTime)
    document.addEventListener('visibilitychange', onHide)
    return () => {
      window.clearInterval(id)
      window.clearInterval(flush)
      document.removeEventListener('visibilitychange', onHide)
    }
  }, [update, withTime])

  useEffect(() => {
    if (remaining == null) return
    if (remaining <= 0) finish('time')
    else if (remaining <= 60_000 && remaining > 59_000) setAnnounce('One minute remaining.')
    else if (remaining <= 300_000 && remaining > 299_000) setAnnounce('Five minutes remaining.')
  }, [remaining, finish])

  const go = useCallback(
    (to: number) => {
      if (to < 0 || to >= questions.length || to === testRef.current.current) return
      update((t) => ({ ...withTime(t), current: to }))
      headingRef.current?.focus({ preventScroll: false })
    },
    [questions.length, update, withTime],
  )

  const choose = useCallback(
    (c: number) => {
      update((t) => {
        if (t.checked[t.current]) return t // answer locked once revealed
        const answers = [...t.answers]
        answers[t.current] = answers[t.current] === c ? null : c
        return { ...t, answers }
      })
    },
    [update],
  )

  const toggleFlag = useCallback(() => {
    update((t) => {
      const flags = [...t.flags]
      flags[t.current] = !flags[t.current]
      return { ...t, flags }
    })
  }, [update])

  function check() {
    update((t) => {
      const checked = [...t.checked]
      checked[t.current] = true
      return { ...t, checked }
    })
  }

  // Keyboard: A–D answer, ←/→ navigate, F flag. Never while typing or while a dialog is open.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey || confirm) return
      const el = e.target as HTMLElement
      if (el.closest('input, textarea, select, [contenteditable="true"], dialog, [aria-label="Calculator"]')) return
      const k = e.key.toLowerCase()
      const letter = ['a', 'b', 'c', 'd'].indexOf(k)
      if (letter >= 0) {
        e.preventDefault()
        choose(letter)
      } else if (e.key === 'ArrowRight') {
        e.preventDefault()
        go(testRef.current.current + 1)
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault()
        go(testRef.current.current - 1)
      } else if (k === 'f') {
        e.preventDefault()
        toggleFlag()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [choose, go, toggleFlag, confirm])

  const answered = test.answers.filter((a) => a !== null).length
  const flagged = test.flags.filter(Boolean).length
  const chosen = test.answers[i]
  const revealed = practice && test.checked[i]
  const low = remaining != null && remaining <= 5 * 60_000

  return (
    <div className="fixed inset-0 z-40 flex flex-col overflow-y-auto bg-plane" role="region" aria-label="Aptitude test">
      <p className="sr-only" aria-live="polite">
        {announce}
      </p>
      {/* Header */}
      <header className="sticky top-0 z-10 border-b border-hairline bg-plane/95 backdrop-blur-sm">
        <div className="mx-auto flex max-w-[1200px] flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3 sm:px-6">
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium tracking-[0.08em] text-muted uppercase">
              Aptitude Lab · {test.config.subject === 'combined' ? 'Combined' : SUBJECT[test.config.subject]} ·{' '}
              {practice ? 'Untimed practice' : test.config.timeMode === 'speed' ? 'Speed challenge' : 'Timed test'}
            </p>
            <div className="mt-1.5 flex items-center gap-3">
              <span className="num text-sm text-ink">
                {answered}/{questions.length} answered
              </span>
              <div
                className="h-1.5 max-w-60 flex-1 overflow-hidden rounded-full bg-well"
                role="progressbar"
                aria-label="Questions answered"
                aria-valuemin={0}
                aria-valuemax={questions.length}
                aria-valuenow={answered}
              >
                <div className="h-full bg-accent transition-[width] duration-200" style={{ width: `${(answered / questions.length) * 100}%` }} />
              </div>
            </div>
          </div>
          {remaining != null && (
            <div
              className={clsx(
                'num flex items-center gap-2 rounded-control border px-3 py-1.5 text-lg',
                low ? 'border-warn/60 text-warn' : 'border-hairline text-ink',
              )}
              role="timer"
              aria-label={`Time remaining ${formatClock(remaining)}`}
            >
              <Clock size={16} aria-hidden />
              {formatClock(remaining)}
            </div>
          )}
          <div className="flex items-center gap-2">
            {test.config.calculator && (
              <Button variant="ghost" size="sm" onClick={() => setShowCalc((v) => !v)} aria-pressed={showCalc} className="lg:hidden">
                <CalcIcon size={16} aria-hidden /> Calculator
              </Button>
            )}
            <Button variant="ghost" size="sm" onClick={() => { update(withTime); onExit() }} title="Your answers are saved; the timer keeps running in timed modes.">
              <LogOut size={16} aria-hidden /> Save &amp; exit
            </Button>
            <Button variant="primary" size="sm" onClick={() => setConfirm(true)}>
              Submit test
            </Button>
          </div>
        </div>
      </header>

      <div className="mx-auto grid w-full max-w-[1200px] flex-1 gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[minmax(0,1fr)_300px]">
        {/* Question */}
        <section aria-labelledby="q-heading" className="min-w-0">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 id="q-heading" ref={headingRef} tabIndex={-1} className="text-xs font-medium tracking-[0.08em] text-muted uppercase focus:outline-none">
              Question {i + 1} of {questions.length} · {SUBJECT[q.subject]} · {topicLabel(q.topic)}
            </h2>
            <span className="text-xs text-muted">{DIFFICULTY_LABEL[q.difficulty]}</span>
          </div>

          <p className="mt-3 max-w-3xl text-lg leading-relaxed font-medium text-ink sm:text-xl">{q.text}</p>
          {q.given && (
            <p className="mt-2 flex items-start gap-2 text-sm text-muted">
              <Info size={15} aria-hidden className="mt-0.5 shrink-0 text-accent" />
              <span>
                <span className="font-medium text-ink">Given:</span> {q.given}
              </span>
            </p>
          )}
          {q.diagram && (
            <div className="mt-4 max-w-2xl">
              <Diagram data={q.diagram} />
            </div>
          )}

          <div role="group" aria-label="Answer choices" className="mt-5 flex max-w-2xl flex-col gap-2">
            {q.choices.map((c, k) => {
              const selected = chosen === k
              const isRight = revealed && k === q.answer
              const isWrong = revealed && selected && k !== q.answer
              return (
                <button
                  key={k}
                  type="button"
                  aria-pressed={selected}
                  disabled={revealed}
                  onClick={() => choose(k)}
                  className={clsx(
                    'flex min-h-12 items-center gap-3 rounded-control border px-3 py-2.5 text-left transition-colors duration-150 disabled:cursor-default',
                    isRight
                      ? 'border-good bg-good/10'
                      : isWrong
                        ? 'border-danger bg-danger/10'
                        : selected
                          ? 'border-accent bg-accent/10'
                          : 'border-hairline bg-surface hover:border-control',
                  )}
                >
                  <span
                    className={clsx(
                      'num flex size-7 shrink-0 items-center justify-center rounded-full border text-sm',
                      selected ? 'border-accent bg-accent text-accent-ink' : 'border-control text-muted',
                    )}
                    aria-hidden
                  >
                    {LETTERS[k]}
                  </span>
                  <span className="text-ink">{c}</span>
                  {isRight && <CheckCircle2 size={18} className="ml-auto text-good" aria-label="Correct answer" />}
                  {isWrong && <XCircle size={18} className="ml-auto text-danger" aria-label="Your answer, incorrect" />}
                </button>
              )
            })}
          </div>

          {revealed && (
            <div className="mt-4 max-w-2xl rounded-control border border-hairline bg-well px-4 py-3 text-sm" role="status">
              <p className={clsx('font-medium', chosen === q.answer ? 'text-good' : 'text-danger')}>
                {chosen === q.answer ? 'Correct.' : `Not quite — the answer is ${LETTERS[q.answer]}.`}
              </p>
              {q.formula && <p className="num mt-2 text-muted">{q.formula}</p>}
              <ol className="mt-2 list-decimal space-y-1 pl-5 text-ink">
                {q.explanation.map((s, n) => (
                  <li key={n}>{s}</li>
                ))}
              </ol>
            </div>
          )}

          <div className="mt-6 flex max-w-2xl flex-wrap items-center gap-2">
            <Button onClick={() => go(i - 1)} disabled={i === 0}>
              <ArrowLeft size={16} aria-hidden /> Previous
            </Button>
            <Button onClick={() => go(i + 1)} disabled={i === questions.length - 1}>
              Next <ArrowRight size={16} aria-hidden />
            </Button>
            <Button variant="ghost" onClick={toggleFlag} aria-pressed={test.flags[i]} className={test.flags[i] ? 'text-warn' : undefined}>
              <Flag size={16} aria-hidden fill={test.flags[i] ? 'currentColor' : 'none'} /> {test.flags[i] ? 'Flagged' : 'Flag for review'}
            </Button>
            {practice && !revealed && (
              <Button variant="ghost" onClick={check} disabled={chosen === null} className="ml-auto">
                Check answer
              </Button>
            )}
          </div>
          <p className="mt-4 hidden text-xs text-muted sm:block">
            Keys: <kbd className="num">A</kbd>–<kbd className="num">D</kbd> answer · <kbd className="num">←</kbd>/<kbd className="num">→</kbd> move ·{' '}
            <kbd className="num">F</kbd> flag
          </p>
        </section>

        {/* Navigator + calculator */}
        <aside className="flex flex-col gap-4" aria-label="Test navigation">
          <div className="rounded-card border border-hairline bg-surface p-3">
            <div className="mb-2 flex items-center justify-between text-xs text-muted">
              <span>Questions</span>
              <span>
                {flagged > 0 && (
                  <>
                    <Flag size={12} aria-hidden className="mr-1 inline text-warn" />
                    {flagged} flagged
                  </>
                )}
              </span>
            </div>
            <ol className="grid grid-cols-8 gap-1.5 sm:grid-cols-10 lg:grid-cols-6">
              {questions.map((_, n) => {
                const a = test.answers[n] !== null
                const f = test.flags[n]
                return (
                  <li key={n}>
                    <button
                      type="button"
                      onClick={() => go(n)}
                      aria-current={n === i ? 'step' : undefined}
                      aria-label={`Question ${n + 1}${a ? ', answered' : ', not answered'}${f ? ', flagged' : ''}`}
                      className={clsx(
                        'num relative flex h-9 w-full items-center justify-center rounded-[4px] border text-xs transition-colors duration-150',
                        n === i ? 'border-accent text-ink ring-1 ring-accent' : 'border-hairline',
                        a ? 'bg-surface-raised text-ink' : 'bg-well text-muted',
                      )}
                    >
                      {n + 1}
                      {f && <span aria-hidden className="absolute top-0.5 right-0.5 size-1.5 rounded-full bg-warn" />}
                    </button>
                  </li>
                )
              })}
            </ol>
            <p className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted">
              <span className="inline-flex items-center gap-1">
                <span aria-hidden className="size-3 rounded-[3px] border border-hairline bg-surface-raised" /> answered
              </span>
              <span className="inline-flex items-center gap-1">
                <span aria-hidden className="size-3 rounded-[3px] border border-hairline bg-well" /> open
              </span>
              <span className="inline-flex items-center gap-1">
                <span aria-hidden className="size-1.5 rounded-full bg-warn" /> flagged
              </span>
            </p>
          </div>
          {test.config.calculator && <div className={clsx(!showCalc && 'hidden lg:block')}>{<Calculator />}</div>}
        </aside>
      </div>

      <Dialog
        open={confirm}
        onClose={() => setConfirm(false)}
        title="Submit the test?"
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirm(false)} data-autofocus>
              Keep going
            </Button>
            <Button variant="primary" onClick={() => finish('submitted')}>
              Submit now
            </Button>
          </>
        }
      >
        <div className="space-y-1 text-sm text-muted">
          <p>
            <span className="num text-ink">{answered}</span> of {questions.length} answered
            {questions.length - answered > 0 && (
              <>
                {' '}
                — <span className="num text-ink">{questions.length - answered}</span> unanswered will be marked wrong
              </>
            )}
            .
          </p>
          {flagged > 0 && (
            <p>
              <span className="num text-ink">{flagged}</span> question{flagged === 1 ? ' is' : 's are'} flagged for review.
            </p>
          )}
        </div>
      </Dialog>
    </div>
  )
}
