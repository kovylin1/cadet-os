import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Atom, Calculator, FlaskConical, History, Info, Play, Trash2 } from 'lucide-react'
import clsx from 'clsx'
import { buildTest, defaultMinutes, generateQuestion, GENERATOR_VERSION, poolTopics, topicLabel, topicsOf, weakAreaWeights } from '../lab/engine'
import { randomSeed } from '../lab/rng'
import { clearActive, loadActive, saveActive, type ActiveTest } from '../lab/session'
import { consistency, historyPoints, mean, topicMastery } from '../lab/stats'
import type { DifficultyMode, LabResult, Question, Subject, TestConfig, TestSubject, TimeMode, Topic } from '../lab/types'
import { formatDay, todayKey } from '../lib/dates'
import { newId } from '../lib/ids'
import { studyHref, useStudyTab, type StudyTab } from '../lib/routes'
import { useActions, useData } from '../state/store'
import { useToast } from '../state/toast'
import { PageHeader } from '../components/layout/AppShell'
import { LabTrend } from '../components/lab/LabTrend'
import { DIFFICULTY_NAME, ResultsView, secs } from '../components/lab/ResultsView'
import { TestRunner } from '../components/lab/TestRunner'
import { Button } from '../components/ui/Button'
import { Card, CardHeader, Eyebrow } from '../components/ui/Card'
import { ConfirmDialog } from '../components/ui/Dialog'
import { Field, Input } from '../components/ui/Field'
import { EmptyState, Note } from '../components/ui/Misc'
import { Segmented } from '../components/ui/Segmented'

const SUBJECT_NAME: Record<TestSubject, string> = { math: 'Mathematics', physics: 'Physics', combined: 'Combined' }

function resultFromHash(): string | null {
  return window.location.hash.match(/[?&]result=([\w-]+)/)?.[1] ?? null
}

function defaultConfig(subject: TestSubject): TestConfig {
  return { subject, count: 50, difficulty: 'adaptive', topics: [], timeMode: 'timed', minutes: 45, calculator: false }
}

export function Study() {
  const tab = useStudyTab()
  const data = useData()
  const actions = useActions()
  const toast = useToast()
  const [active, setActive] = useState<{ test: ActiveTest; questions: Question[] } | null>(() => loadActive())
  const [running, setRunning] = useState(false)
  const [resultId, setResultId] = useState<string | null>(resultFromHash)
  const [discarding, setDiscarding] = useState(false)

  useEffect(() => {
    const onHash = () => setResultId(resultFromHash())
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])

  const showResult = useCallback(
    (id: string | null, subject: StudyTab = tab) => {
      setResultId(id)
      window.history.replaceState(null, '', id ? `${studyHref(subject)}?result=${id}` : studyHref(subject))
      window.scrollTo({ top: 0 })
    },
    [tab],
  )

  const finishedIds = useRef(new Set<string>())
  const finish = useCallback(
    (test: ActiveTest, reason: 'submitted' | 'time') => {
      // Guard against a second call for the same run (effects can fire twice).
      if (finishedIds.current.has(test.id)) return
      finishedIds.current.add(test.id)
      const questions = active?.questions ?? test.keys.map(generateQuestion)
      const items = test.keys.map((key, i) => ({
        key,
        subject: questions[i].subject,
        topic: questions[i].topic,
        difficulty: questions[i].difficulty,
        choice: test.answers[i],
        answer: questions[i].answer,
        timeMs: Math.round(test.timeMs[i]),
        expected: questions[i].expectedSeconds,
        flagged: test.flags[i],
        checked: test.checked[i],
      }))
      const result: LabResult = {
        id: newId('lab'),
        generatorVersion: GENERATOR_VERSION,
        date: todayKey(),
        startedAt: test.startedAt,
        finishedAt: new Date().toISOString(),
        config: test.config,
        durationSec: Math.round(items.reduce((a, it) => a + it.timeMs, 0) / 1000),
        endReason: reason,
        items,
      }
      actions.addLabResult(result)
      clearActive()
      setActive(null)
      setRunning(false)
      if (reason === 'time') toast({ message: 'Time is up — the test was submitted automatically.' })
      showResult(result.id, test.config.subject === 'physics' ? 'physics' : 'math')
    },
    [actions, active, showResult, toast],
  )

  // A timed test whose deadline passed while the app was closed is submitted on return.
  useEffect(() => {
    if (active && !running && active.test.deadline != null && active.test.deadline <= Date.now()) finish(active.test, 'time')
  }, [active, running, finish])

  function start(config: TestConfig) {
    const seed = randomSeed()
    const keys = buildTest(config, seed, data.lab)
    const questions = keys.map(generateQuestion)
    const n = keys.length
    const test: ActiveTest = {
      id: newId('run'),
      config,
      keys,
      answers: Array(n).fill(null),
      flags: Array(n).fill(false),
      checked: Array(n).fill(false),
      timeMs: Array(n).fill(0),
      current: 0,
      startedAt: new Date().toISOString(),
      deadline: config.timeMode === 'untimed' ? null : Date.now() + config.minutes * 60_000,
    }
    if (!saveActive(test)) toast({ tone: 'error', message: "Browser storage is blocked, so this test can't be resumed if the page reloads." })
    setActive({ test, questions })
    setRunning(true)
    // Leaving the test (Save & exit) should land on the Lab page with the resume banner.
    showResult(null, config.subject === 'physics' ? 'physics' : config.subject === 'math' ? 'math' : tab)
  }

  // Keep the page title and focus sensible while the exam overlay is up.
  useEffect(() => {
    if (!running) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [running])

  if (running && active) {
    return (
      <TestRunner
        test={active.test}
        questions={active.questions}
        onChange={(test) => setActive((a) => (a ? { ...a, test } : a))}
        onFinish={finish}
        onExit={() => setRunning(false)}
      />
    )
  }

  const result = resultId ? data.lab.find((r) => r.id === resultId) : null
  if (result) {
    return (
      <>
        <PageHeader title="Test results" description="CADET OS-generated practice — tracked separately from official provider scores." />
        <ResultsView
          result={result}
          onBack={() => showResult(null)}
          onWeakAreas={() => start({ ...result.config, topics: [], weights: weakAreaWeights(result) })}
        />
      </>
    )
  }

  return (
    <>
      <PageHeader
        title="Aptitude Lab"
        description="Generated Mathematics and Physics practice in the style of pilot aptitude tests. Original questions, built offline; not affiliated with Symbiotics, PilotSphere or Air Astana."
      />

      <nav aria-label="Subject" className="mb-6 flex gap-1 border-b border-hairline">
        {(['math', 'physics'] as const).map((t) => (
          <a
            key={t}
            href={studyHref(t)}
            aria-current={tab === t ? 'page' : undefined}
            className={clsx(
              '-mb-px flex h-11 items-center gap-2 border-b-2 px-4 text-sm transition-colors duration-200',
              tab === t ? 'border-accent font-medium text-ink' : 'border-transparent text-muted hover:text-ink',
            )}
          >
            {t === 'math' ? <Calculator size={16} aria-hidden /> : <Atom size={16} aria-hidden />}
            {SUBJECT_NAME[t]}
          </a>
        ))}
      </nav>

      {active && (
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-card border border-accent/50 bg-accent/8 px-4 py-3">
          <div className="text-sm">
            <p className="font-medium text-ink">Test in progress — {SUBJECT_NAME[active.test.config.subject]}, {active.test.keys.length} questions</p>
            <p className="text-muted">
              {active.test.answers.filter((a) => a !== null).length} answered
              {active.test.deadline != null && ` · ${Math.max(0, Math.ceil((active.test.deadline - Date.now()) / 60000))} min left (the timer keeps running)`}
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => setDiscarding(true)}>
              <Trash2 size={16} aria-hidden /> Discard
            </Button>
            <Button variant="primary" onClick={() => setRunning(true)}>
              <Play size={16} aria-hidden /> Resume
            </Button>
          </div>
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <SetupCard key={tab} tab={tab} onStart={start} disabled={Boolean(active)} />
        <HistoryCard subject={tab} results={data.lab} onOpen={(id) => showResult(id)} />
      </div>

      <ConfirmDialog
        open={discarding}
        title="Discard the test in progress?"
        message="Its answers won't be saved and it won't appear in your history."
        confirmLabel="Discard test"
        onCancel={() => setDiscarding(false)}
        onConfirm={() => {
          clearActive()
          setActive(null)
          setDiscarding(false)
        }}
      />
    </>
  )
}

/* ---------------- setup ---------------- */

function SetupCard({ tab, onStart, disabled }: { tab: StudyTab; onStart: (c: TestConfig) => void; disabled: boolean }) {
  const [config, setConfig] = useState<TestConfig>(() => defaultConfig(tab))
  const [custom, setCustom] = useState(false)
  const [minutesText, setMinutesText] = useState('45')
  const set = (patch: Partial<TestConfig>) => setConfig((c) => ({ ...c, ...patch }))

  const subjects: Subject[] = config.subject === 'combined' ? ['math', 'physics'] : [config.subject]
  const minutes = Number(minutesText)
  const minutesOk = config.timeMode === 'untimed' || (Number.isInteger(minutes) && minutes >= 1 && minutes <= 300)
  const topicsOk = !custom || config.topics.length > 0

  function setCountOrMode(patch: Partial<TestConfig>) {
    const next = { ...config, ...patch }
    setConfig(next)
    if (next.timeMode !== 'untimed') setMinutesText(String(defaultMinutes(next.count, next.timeMode)))
  }

  function toggleTopic(t: Topic) {
    set({ topics: config.topics.includes(t) ? config.topics.filter((x) => x !== t) : [...config.topics, t] })
  }

  return (
    <Card>
      <CardHeader title="New test" description="Every test is generated fresh: new numbers, scenarios and distractors each time." />
      <form
        className="flex flex-col gap-5 px-4 pt-4 pb-5 sm:px-5"
        onSubmit={(e) => {
          e.preventDefault()
          if (!minutesOk || !topicsOk) return
          onStart({ ...config, topics: custom ? config.topics : [], minutes: config.timeMode === 'untimed' ? 0 : minutes })
        }}
      >
        <Option label="Subject">
          <Segmented
            label="Subject"
            value={config.subject}
            onChange={(v) => set({ subject: v, topics: [] })}
            options={[
              { value: 'math', label: 'Mathematics' },
              { value: 'physics', label: 'Physics' },
              { value: 'combined', label: 'Combined' },
            ]}
          />
        </Option>
        <Option label="Questions">
          <Segmented
            label="Number of questions"
            value={String(config.count) as '10'}
            onChange={(v) => setCountOrMode({ count: Number(v) as TestConfig['count'] })}
            options={['10', '20', '30', '50'].map((v) => ({ value: v as '10', label: v }))}
          />
        </Option>
        <Option label="Difficulty" hint={config.difficulty === 'adaptive' ? 'Weights topics and levels by your recent accuracy, speed and how often you have seen each topic.' : undefined}>
          <Segmented
            label="Difficulty"
            value={config.difficulty}
            onChange={(v: DifficultyMode) => set({ difficulty: v })}
            options={[
              { value: 'basic', label: 'Basic' },
              { value: 'intermediate', label: 'Intermediate' },
              { value: 'advanced', label: 'Advanced' },
              { value: 'adaptive', label: 'Adaptive mixed' },
            ]}
          />
        </Option>
        <Option label="Timing">
          <div className="flex flex-wrap items-end gap-3">
            <Segmented
              label="Time mode"
              value={config.timeMode}
              onChange={(v: TimeMode) => setCountOrMode({ timeMode: v })}
              options={[
                { value: 'untimed', label: 'Untimed practice' },
                { value: 'timed', label: 'Timed test' },
                { value: 'speed', label: 'Speed challenge' },
              ]}
            />
            {config.timeMode !== 'untimed' && (
              <Field label="Minutes" error={minutesOk ? undefined : '1–300'} className="w-24">
                {({ id, invalid, describedBy }) => (
                  <Input id={id} inputMode="numeric" value={minutesText} invalid={invalid} aria-describedby={describedBy} onChange={(e) => setMinutesText(e.target.value.trim())} />
                )}
              </Field>
            )}
          </div>
          <p className="mt-1.5 text-xs text-muted">
            {config.timeMode === 'untimed'
              ? 'No clock. You can check each answer and read the working as you go.'
              : config.timeMode === 'speed'
                ? 'A tight clock (about 36 s per question) to build pace. Answers are revealed after you submit.'
                : 'Answers are revealed after you submit; the test submits itself when time runs out.'}{' '}
            The time limit is a practice setting you can change, not an official ADAPT limit.
          </p>
        </Option>
        <Option label="Calculator">
          <Segmented
            label="Calculator"
            value={config.calculator ? 'on' : 'off'}
            onChange={(v) => set({ calculator: v === 'on' })}
            options={[
              { value: 'off', label: 'Disabled' },
              { value: 'on', label: 'Enabled' },
            ]}
          />
        </Option>
        <Option label="Topics">
          <Segmented
            label="Topics"
            value={custom ? 'custom' : 'all'}
            onChange={(v) => {
              setCustom(v === 'custom')
              if (v === 'all') set({ topics: [] })
            }}
            options={[
              { value: 'all', label: 'All topics' },
              { value: 'custom', label: 'Choose topics' },
            ]}
          />
          {custom && (
            <fieldset className="mt-3">
              <legend className="sr-only">Topics to include</legend>
              {subjects.map((s) => (
                <div key={s} className="mb-2">
                  {subjects.length > 1 && <p className="mb-1 text-xs text-muted">{SUBJECT_NAME[s]}</p>}
                  <div className="grid gap-1 sm:grid-cols-2">
                    {topicsOf(s).map((t) => (
                      <label key={t} className="flex min-h-10 cursor-pointer items-center gap-2.5 rounded-control px-2 text-sm hover:bg-surface-raised">
                        <input type="checkbox" checked={config.topics.includes(t)} onChange={() => toggleTopic(t)} className="size-4 accent-[var(--color-accent)]" />
                        {topicLabel(t)}
                      </label>
                    ))}
                  </div>
                </div>
              ))}
              {!topicsOk && <p className="text-sm text-danger">Choose at least one topic.</p>}
            </fieldset>
          )}
        </Option>
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-hairline pt-4">
          <p className="text-sm text-muted">
            <span className="num text-ink">{config.count}</span> questions · {poolTopics({ subject: config.subject, topics: custom ? config.topics : [] }).length} topics
            {config.timeMode !== 'untimed' && minutesOk && (
              <>
                {' '}
                · <span className="num text-ink">{minutes}</span> min
              </>
            )}
          </p>
          <Button type="submit" variant="primary" disabled={disabled || !minutesOk || !topicsOk} title={disabled ? 'Finish or discard the test in progress first' : undefined}>
            <Play size={16} aria-hidden /> Start test
          </Button>
        </div>
      </form>
    </Card>
  )
}

function Option({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <Eyebrow>{label}</Eyebrow>
      <div className="mt-2 overflow-x-auto">{children}</div>
      {hint && <p className="mt-1.5 text-xs text-muted">{hint}</p>}
    </div>
  )
}

/* ---------------- history & trends ---------------- */

function HistoryCard({ subject, results, onOpen }: { subject: Subject; results: LabResult[]; onOpen: (id: string) => void }) {
  const points = useMemo(() => historyPoints(results, subject), [results, subject])
  const mastery = useMemo(() => topicMastery(results, subject).sort((a, b) => a.accuracy - b.accuracy), [results, subject])
  const list = useMemo(
    () => [...results].filter((r) => r.items.some((i) => i.subject === subject)).sort((a, b) => (a.finishedAt < b.finishedAt ? 1 : -1)),
    [results, subject],
  )
  const [metric, setMetric] = useState<'accuracy' | 'secPerQ'>('accuracy')

  if (!points.length) {
    return (
      <Card>
        <CardHeader title={`${SUBJECT_NAME[subject]} history`} />
        <div className="p-4 sm:p-5">
          <EmptyState icon={History} title="No tests yet">
            Finish a {SUBJECT_NAME[subject].toLowerCase()} or combined test and your accuracy, pace and topic mastery appear here.
          </EmptyState>
        </div>
      </Card>
    )
  }

  const acc = points.map((p) => p.accuracy)
  const sd = consistency(points)
  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader
          title={`${SUBJECT_NAME[subject]} trend`}
          description="CADET OS-generated tests only"
          actions={
            <Segmented
              label="Metric"
              value={metric}
              onChange={setMetric}
              options={[
                { value: 'accuracy', label: 'Accuracy' },
                { value: 'secPerQ', label: 'Speed' },
              ]}
            />
          }
        />
        <dl className="grid grid-cols-2 gap-3 px-4 pt-4 text-sm sm:grid-cols-4 sm:px-5">
          <Mini label="Latest" value={`${Math.round(acc[acc.length - 1])}%`} />
          <Mini label="Best" value={`${Math.round(Math.max(...acc))}%`} />
          <Mini label="Average" value={`${Math.round(mean(acc))}%`} />
          <Mini label="Consistency" value={sd == null ? '—' : `±${Math.round(sd)} pts`} title="Spread of your last five accuracies; needs three tests" />
        </dl>
        <div className="px-1 pt-3 pb-2">
          {points.length > 1 ? (
            <LabTrend points={points} metric={metric} />
          ) : (
            <p className="px-4 py-6 text-sm text-muted">One test so far — the trend line appears after the next one.</p>
          )}
        </div>
        <p className="px-4 pb-4 text-xs text-muted sm:px-5">
          Mean pace {secs(mean(points.map((p) => p.secPerQ)))} per question. Difficulty differs between tests, so compare like with like.
        </p>
      </Card>

      <Card>
        <CardHeader title="Topic mastery" description="Weakest first · last 10 questions per topic in brackets" />
        <ul className="flex flex-col gap-2.5 px-4 pt-3 pb-4 sm:px-5">
          {mastery.map((m) => (
            <li key={m.topic} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1 text-sm">
              <span className="truncate text-ink">{topicLabel(m.topic)}</span>
              <span className="num text-muted">
                <span className="text-ink">{Math.round(m.accuracy)}%</span> ({Math.round(m.recent)}%) · {m.seen} q
              </span>
              <div className="col-span-2 h-1.5 overflow-hidden rounded-full bg-well" aria-hidden>
                <div className={clsx('h-full rounded-full', m.accuracy >= 80 ? 'bg-good' : m.accuracy >= 50 ? 'bg-accent' : 'bg-warn')} style={{ width: `${Math.max(m.accuracy, 2)}%` }} />
              </div>
            </li>
          ))}
        </ul>
      </Card>

      <Card>
        <CardHeader title="Past tests" />
        <ul className="divide-y divide-hairline px-2 pt-2 pb-2">
          {list.slice(0, 12).map((r) => {
            const ok = r.items.filter((i) => i.choice === i.answer).length
            return (
              <li key={r.id}>
                <button type="button" onClick={() => onOpen(r.id)} className="flex w-full items-center gap-3 rounded-control px-2 py-2.5 text-left text-sm hover:bg-surface-raised">
                  <FlaskConical size={16} aria-hidden className="shrink-0 text-accent" />
                  <span className="min-w-0 flex-1">
                    <span className="block text-ink">
                      {SUBJECT_NAME[r.config.subject]} · {DIFFICULTY_NAME[r.config.difficulty]}
                    </span>
                    <span className="block text-xs text-muted">
                      {formatDay(r.date, 'EEE d MMM')} · {r.config.timeMode === 'untimed' ? 'untimed' : `${r.config.minutes} min`}
                      {r.config.weights && ' · weak-area practice'}
                    </span>
                  </span>
                  <span className="num text-ink">
                    {ok}/{r.items.length}
                  </span>
                  <span className="num w-12 text-right text-muted">{Math.round((ok / r.items.length) * 100)}%</span>
                </button>
              </li>
            )
          })}
        </ul>
      </Card>

      <Note icon={Info}>
        Aptitude Lab accuracy is its own scale. It is never mixed with your recorded practice-test percentages or stens, and it doesn't predict an
        official result.
      </Note>
    </div>
  )
}

function Mini({ label, value, title }: { label: string; value: string; title?: string }) {
  return (
    <div title={title}>
      <dt className="text-xs text-muted">{label}</dt>
      <dd className="num mt-0.5 text-lg text-ink">{value}</dd>
    </div>
  )
}

