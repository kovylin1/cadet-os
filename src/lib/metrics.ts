import { subDays } from 'date-fns'
import type { AppData, Attempt } from '../types'
import { toDayKey } from './dates'

/*
 * Scoring scales.
 *
 * A "scale" is a set of values that can legitimately be compared with each
 * other. Percentages compare with percentages, stens with stens. Raw scores only
 * compare when they count the same thing out of the same maximum, so the unit
 * and the maximum are part of the raw scale key. Nothing here ever averages
 * across scales.
 */

export type ScaleKey = 'percentage' | 'sten' | 'scaled' | `raw:${string}`

const RAW_PREFIX = 'raw:'

export function rawScaleKey(unit: string, max: number | null): ScaleKey {
  return `${RAW_PREFIX}${unit.trim()}|${max ?? ''}`
}

function parseRawKey(key: ScaleKey): { unit: string; max: number | null } | null {
  if (!key.startsWith(RAW_PREFIX)) return null
  const [unit, max] = key.slice(RAW_PREFIX.length).split('|')
  return { unit, max: max === '' || max === undefined ? null : Number(max) }
}

export interface ScaleInfo {
  key: ScaleKey
  label: string
  /** Lower and upper bounds when the scale has fixed ones (used for chart domains). */
  min: number | null
  max: number | null
}

export function scaleInfo(key: ScaleKey): ScaleInfo {
  if (key === 'percentage') return { key, label: 'Percentage', min: 0, max: 100 }
  if (key === 'sten') return { key, label: 'Sten (1–10)', min: 1, max: 10 }
  if (key === 'scaled') return { key, label: 'Scaled score', min: null, max: null }
  const raw = parseRawKey(key)!
  const unit = raw.unit || 'raw'
  return {
    key,
    label: raw.max != null ? `Raw · ${unit} / ${raw.max}` : `Raw · ${unit}`,
    min: 0,
    max: raw.max,
  }
}

export function valueOn(a: Attempt, key: ScaleKey): number | null {
  switch (key) {
    case 'percentage':
      return a.percentage
    case 'sten':
      return a.sten
    case 'scaled':
      return a.scaledScore
    default:
      return a.rawScore != null && rawScaleKey(a.rawUnit, a.maxScore) === key ? a.rawScore : null
  }
}

function round(value: number, digits = 1): string {
  const fixed = value.toFixed(digits)
  return fixed.replace(/\.0+$/, '')
}

export function formatValue(value: number, key: ScaleKey): string {
  if (key === 'percentage') return `${round(value)}%`
  if (key === 'sten') return `${round(value)}/10`
  if (key === 'scaled') return round(value)
  const raw = parseRawKey(key)!
  const out = raw.max != null ? `${round(value)}/${raw.max}` : round(value)
  return raw.unit ? `${out} ${raw.unit}` : out
}

/** Short form for chart ticks and deltas, without the raw unit text. */
export function formatCompact(value: number, key: ScaleKey): string {
  if (key === 'percentage') return `${round(value)}%`
  return round(value)
}

export function formatDelta(delta: number, key: ScaleKey): string {
  const sign = delta > 0 ? '+' : delta < 0 ? '−' : '±'
  const abs = Math.abs(delta)
  if (key === 'percentage') return `${sign}${round(abs)} pts`
  return `${sign}${round(abs)}`
}

const ORDER: Record<string, number> = { percentage: 0, sten: 1, scaled: 2 }

function scaleOrder(key: ScaleKey): number {
  return ORDER[key] ?? 3
}

export function scaleKeysOf(a: Attempt): ScaleKey[] {
  const keys: ScaleKey[] = []
  if (a.percentage != null) keys.push('percentage')
  if (a.sten != null) keys.push('sten')
  if (a.scaledScore != null) keys.push('scaled')
  if (a.rawScore != null) keys.push(rawScaleKey(a.rawUnit, a.maxScore))
  return keys
}

export function availableScales(attempts: Attempt[]): ScaleKey[] {
  const seen = new Set<ScaleKey>()
  for (const a of attempts) for (const k of scaleKeysOf(a)) seen.add(k)
  return [...seen].sort((a, b) => scaleOrder(a) - scaleOrder(b))
}

export function primaryScale(a: Attempt): ScaleKey | null {
  return scaleKeysOf(a)[0] ?? null
}

export function sortAttempts(attempts: Attempt[]): Attempt[] {
  return [...attempts].sort((a, b) => a.date.localeCompare(b.date) || a.createdAt.localeCompare(b.createdAt))
}

export function hasAnyScore(a: Attempt): boolean {
  return scaleKeysOf(a).length > 0
}

export type Trend = 'improving' | 'declining' | 'steady'

export interface Point {
  attempt: Attempt
  value: number
}

export interface ScaleStats {
  scale: ScaleKey
  count: number
  points: Point[]
  first: Point
  latest: Point
  previous: Point | null
  best: Point
  average: number
  changeFromPrevious: number | null
  firstToLatest: number | null
  /** null until there are at least three attempts — two points are a change, not a trend. */
  trend: Trend | null
  slopePerAttempt: number | null
}

export const MIN_TREND_POINTS = 3

function slope(values: number[]): number {
  const n = values.length
  const meanX = (n - 1) / 2
  const meanY = values.reduce((s, v) => s + v, 0) / n
  let num = 0
  let den = 0
  values.forEach((y, x) => {
    num += (x - meanX) * (y - meanY)
    den += (x - meanX) ** 2
  })
  return den === 0 ? 0 : num / den
}

function steadyThreshold(key: ScaleKey, values: number[]): number {
  const info = scaleInfo(key)
  const span =
    info.max != null && info.min != null
      ? info.max - info.min
      : Math.max(...values.map(Math.abs), 1)
  return span * 0.02
}

/** Stats for one category's attempts on one scale. Higher is better on every supported scale. */
export function scaleStats(attempts: Attempt[], key: ScaleKey): ScaleStats | null {
  const points: Point[] = []
  for (const a of sortAttempts(attempts)) {
    const value = valueOn(a, key)
    if (value != null) points.push({ attempt: a, value })
  }
  if (points.length === 0) return null

  const values = points.map((p) => p.value)
  const latest = points[points.length - 1]
  const previous = points.length > 1 ? points[points.length - 2] : null
  // Earliest attempt wins a tie for best, so a repeat doesn't steal the "personal best" marker.
  const best = points.reduce((b, p) => (p.value > b.value ? p : b), points[0])

  let trend: Trend | null = null
  let slopePerAttempt: number | null = null
  if (points.length >= MIN_TREND_POINTS) {
    slopePerAttempt = slope(values)
    const threshold = steadyThreshold(key, values)
    trend = Math.abs(slopePerAttempt) < threshold ? 'steady' : slopePerAttempt > 0 ? 'improving' : 'declining'
  }

  return {
    scale: key,
    count: points.length,
    points,
    first: points[0],
    latest,
    previous,
    best,
    average: values.reduce((s, v) => s + v, 0) / values.length,
    changeFromPrevious: previous ? latest.value - previous.value : null,
    firstToLatest: points.length > 1 ? latest.value - points[0].value : null,
    trend,
    slopePerAttempt,
  }
}

export interface TrainingSummary {
  /** Completed non-rest tasks plus check-ins that aren't tied to a task. */
  sessions: number
  minutes: number
  /** Consecutive days with any completed task, check-in or logged result. Rest days count. */
  streak: number
}

export function trainingSummary(data: AppData, now: Date = new Date()): TrainingSummary {
  const minutesByTask = new Map<string, number>()
  for (const s of data.sessions) {
    if (s.taskId) minutesByTask.set(s.taskId, (minutesByTask.get(s.taskId) ?? 0) + s.durationMinutes)
  }
  let sessions = 0
  let minutes = 0
  const activeDays = new Set<string>()

  // Tasks that count as a session; their check-ins add actual minutes instead of planned ones.
  const countedTasks = new Set<string>()
  for (const t of data.tasks) {
    if (!t.completed) continue
    activeDays.add(t.date)
    if (t.category === 'rest') continue
    countedTasks.add(t.id)
    sessions += 1
    minutes += minutesByTask.get(t.id) ?? t.plannedMinutes ?? 0
  }
  for (const s of data.sessions) {
    activeDays.add(s.date)
    if (s.taskId && countedTasks.has(s.taskId)) continue
    sessions += 1
    minutes += s.durationMinutes
  }
  for (const a of data.attempts) activeDays.add(a.date)

  let cursor = now
  if (!activeDays.has(toDayKey(cursor))) cursor = subDays(cursor, 1)
  let streak = 0
  while (activeDays.has(toDayKey(cursor))) {
    streak += 1
    cursor = subDays(cursor, 1)
  }

  return { sessions, minutes, streak }
}

export function formatHours(minutes: number): string {
  const h = minutes / 60
  return h >= 10 ? h.toFixed(0) : h.toFixed(1)
}
