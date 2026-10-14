import { subjectOfTopic } from './topics'
import type { Difficulty, LabResult, ResultItem, Subject, Topic } from './types'

/*
 * Aptitude Lab scores are CADET OS-generated practice: accuracy (% correct)
 * and pace only. They are never converted to sten or compared with scores from
 * other providers.
 */

export interface Tally {
  total: number
  correct: number
  answered: number
}

const tally = (items: ResultItem[]): Tally => ({
  total: items.length,
  correct: items.filter((i) => i.choice === i.answer).length,
  answered: items.filter((i) => i.choice !== null).length,
})

export const pct = (t: Tally) => (t.total ? (t.correct / t.total) * 100 : 0)

function groupBy<K>(items: ResultItem[], key: (i: ResultItem) => K): Map<K, Tally> {
  const map = new Map<K, ResultItem[]>()
  for (const it of items) map.set(key(it), [...(map.get(key(it)) ?? []), it])
  return new Map([...map].map(([k, v]) => [k, tally(v)]))
}

export interface ResultSummary {
  overall: Tally
  incorrect: number
  unanswered: number
  percent: number
  durationSec: number
  avgSec: number
  bySubject: Map<Subject, Tally>
  byTopic: Map<Topic, Tally>
  byDifficulty: Map<Difficulty, Tally>
  fastest: { index: number; ms: number }[]
  slowest: { index: number; ms: number }[]
  flagged: number[]
}

export function summarize(r: LabResult): ResultSummary {
  const overall = tally(r.items)
  const timed = r.items.map((it, index) => ({ index, ms: it.timeMs, answered: it.choice !== null })).filter((x) => x.answered && x.ms > 0)
  const byTime = [...timed].sort((a, b) => a.ms - b.ms)
  return {
    overall,
    incorrect: overall.answered - overall.correct,
    unanswered: overall.total - overall.answered,
    percent: pct(overall),
    durationSec: r.durationSec,
    avgSec: r.items.length ? r.durationSec / r.items.length : 0,
    bySubject: groupBy(r.items, (i) => i.subject),
    byTopic: groupBy(r.items, (i) => i.topic),
    byDifficulty: groupBy(r.items, (i) => i.difficulty),
    fastest: byTime.slice(0, 3),
    slowest: byTime.slice(-3).reverse(),
    flagged: r.items.flatMap((it, i) => (it.flagged ? [i] : [])),
  }
}

/* ---------------- history & trends ---------------- */

export interface HistoryPoint {
  id: string
  date: string
  label: string
  subject: Subject
  /** Accuracy on this subject's questions within the test, 0–100. */
  accuracy: number
  /** Mean seconds per question for this subject. */
  secPerQ: number
  /** Mean difficulty level 1–3. */
  difficulty: number
  count: number
}

/** One point per (test, subject): combined tests contribute to both subjects separately. */
export function historyPoints(results: LabResult[], subject: Subject): HistoryPoint[] {
  const sorted = [...results].sort((a, b) => (a.finishedAt < b.finishedAt ? -1 : 1))
  const out: HistoryPoint[] = []
  for (const r of sorted) {
    const items = r.items.filter((i) => i.subject === subject)
    if (!items.length) continue
    const t = tally(items)
    const ms = items.reduce((a, i) => a + i.timeMs, 0)
    out.push({
      id: r.id,
      date: r.date,
      label: '',
      subject,
      accuracy: pct(t),
      secPerQ: ms / 1000 / items.length,
      difficulty: items.reduce((a, i) => a + i.difficulty, 0) / items.length,
      count: items.length,
    })
  }
  return out
}

export function mean(xs: number[]): number {
  return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0
}

/** Standard deviation of the last `n` accuracies — lower means more consistent. */
export function consistency(points: HistoryPoint[], n = 5): number | null {
  const xs = points.slice(-n).map((p) => p.accuracy)
  if (xs.length < 3) return null
  const m = mean(xs)
  return Math.sqrt(mean(xs.map((x) => (x - m) ** 2)))
}

export interface Mastery {
  topic: Topic
  seen: number
  accuracy: number
  /** Accuracy over the most recent 10 questions of this topic. */
  recent: number
}

export function topicMastery(results: LabResult[], subject: Subject): Mastery[] {
  const items = [...results].sort((a, b) => (a.finishedAt < b.finishedAt ? -1 : 1)).flatMap((r) => r.items)
  const map = new Map<Topic, ResultItem[]>()
  for (const it of items) if (subjectOfTopic(it.topic) === subject) map.set(it.topic, [...(map.get(it.topic) ?? []), it])
  return [...map].map(([topic, list]) => ({
    topic,
    seen: list.length,
    accuracy: pct(tally(list)),
    recent: pct(tally(list.slice(-10))),
  }))
}
