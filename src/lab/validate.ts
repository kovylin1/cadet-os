import { isDayKey } from '../lib/dates'
import { isTopic } from './topics'
import type { Difficulty, LabResult, QuestionKey, ResultItem, TestConfig, Topic } from './types'

/*
 * Structural validation for stored / imported Aptitude Lab results. Anything
 * malformed is reported through `fail` so a broken backup is rejected as a
 * whole, exactly like the rest of the import.
 */

type Obj = Record<string, unknown>
type Fail = (field: string, message: string) => void

const isObj = (v: unknown): v is Obj => typeof v === 'object' && v !== null && !Array.isArray(v)
const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v)
const isStr = (v: unknown): v is string => typeof v === 'string'
const isDifficulty = (v: unknown): v is Difficulty => v === 1 || v === 2 || v === 3
const oneOf = <T extends string>(v: unknown, options: readonly T[]): v is T => isStr(v) && (options as readonly string[]).includes(v)

function parseKey(v: unknown): QuestionKey | null {
  if (!isObj(v)) return null
  if (!isStr(v.templateId) || !isDifficulty(v.difficulty) || !isNum(v.seed) || !isNum(v.slot)) return null
  return { templateId: v.templateId, difficulty: v.difficulty, seed: v.seed, slot: v.slot }
}

function parseConfig(v: unknown, fail: Fail): TestConfig {
  const fallback: TestConfig = { subject: 'math', count: 10, difficulty: 'intermediate', topics: [], timeMode: 'untimed', minutes: 9, calculator: false }
  if (!isObj(v)) {
    fail('config', 'must be an object')
    return fallback
  }
  if (!oneOf(v.subject, ['math', 'physics', 'combined'] as const)) fail('config.subject', 'is not valid')
  if (![10, 20, 30, 50].includes(v.count as number)) fail('config.count', 'must be 10, 20, 30 or 50')
  if (!oneOf(v.difficulty, ['basic', 'intermediate', 'advanced', 'adaptive'] as const)) fail('config.difficulty', 'is not valid')
  if (!oneOf(v.timeMode, ['untimed', 'timed', 'speed'] as const)) fail('config.timeMode', 'is not valid')
  const topics = Array.isArray(v.topics) ? v.topics.filter(isTopic) : []
  return {
    subject: oneOf(v.subject, ['math', 'physics', 'combined'] as const) ? v.subject : 'math',
    count: ([10, 20, 30, 50] as const).find((c) => c === v.count) ?? 10,
    difficulty: oneOf(v.difficulty, ['basic', 'intermediate', 'advanced', 'adaptive'] as const) ? v.difficulty : 'intermediate',
    topics,
    timeMode: oneOf(v.timeMode, ['untimed', 'timed', 'speed'] as const) ? v.timeMode : 'untimed',
    minutes: isNum(v.minutes) ? v.minutes : 0,
    calculator: v.calculator === true,
  }
}

function parseItem(v: unknown): ResultItem | null {
  if (!isObj(v)) return null
  const key = parseKey(v.key)
  if (!key || !oneOf(v.subject, ['math', 'physics'] as const) || !isTopic(v.topic) || !isDifficulty(v.difficulty)) return null
  if (!(v.choice === null || (isNum(v.choice) && v.choice >= 0 && v.choice <= 3))) return null
  if (!isNum(v.answer) || v.answer < 0 || v.answer > 3 || !isNum(v.timeMs) || v.timeMs < 0) return null
  return {
    key,
    subject: v.subject,
    topic: v.topic as Topic,
    difficulty: v.difficulty,
    choice: v.choice as number | null,
    answer: v.answer,
    timeMs: v.timeMs,
    expected: isNum(v.expected) ? v.expected : 60,
    flagged: v.flagged === true,
    checked: v.checked === true,
  }
}

export function parseLabResult(o: Obj, fail: Fail): LabResult {
  if (!isStr(o.id) || !o.id) fail('id', 'is required')
  if (!isDayKey(o.date)) fail('date', 'must be a date like 2026-11-05')
  const items: ResultItem[] = []
  if (!Array.isArray(o.items) || o.items.length === 0) fail('items', 'must be a non-empty list')
  else
    o.items.forEach((raw, i) => {
      const item = parseItem(raw)
      if (item) items.push(item)
      else fail(`items[${i}]`, 'is not a valid question result')
    })
  return {
    id: isStr(o.id) ? o.id : '',
    generatorVersion: isNum(o.generatorVersion) ? o.generatorVersion : 1,
    date: isStr(o.date) ? o.date : '',
    startedAt: isStr(o.startedAt) ? o.startedAt : '',
    finishedAt: isStr(o.finishedAt) ? o.finishedAt : '',
    config: parseConfig(o.config, fail),
    durationSec: isNum(o.durationSec) && o.durationSec >= 0 ? o.durationSec : 0,
    endReason: o.endReason === 'time' ? 'time' : 'submitted',
    items,
  }
}
