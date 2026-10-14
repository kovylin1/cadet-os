import {
  SCHEMA_VERSION,
  type AppData,
  type Attempt,
  type JournalEntry,
  type Rating,
  type Session,
  type Settings,
  type Task,
} from '../types'
import { isCategoryId } from './categories'
import { isDayKey } from './dates'
import { DEFAULT_SETTINGS } from './seed'

/*
 * Hand-written validation for imported or stored data. It is strict about
 * structure (wrong types reject the whole file) and lenient about optional
 * text, so a file exported by CADET OS always round-trips.
 */

export type ValidationResult = { ok: true; data: AppData } | { ok: false; errors: string[] }

type Obj = Record<string, unknown>

const isObj = (v: unknown): v is Obj => typeof v === 'object' && v !== null && !Array.isArray(v)
const isStr = (v: unknown): v is string => typeof v === 'string'
const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v)
const isRating = (v: unknown): v is Rating => isNum(v) && Number.isInteger(v) && v >= 1 && v <= 5

class Checker {
  errors: string[] = []
  constructor(private path: string) {}

  fail(field: string, message: string) {
    if (this.errors.length < 20) this.errors.push(`${this.path}.${field}: ${message}`)
  }

  str(o: Obj, field: string, { required = false } = {}): string {
    const v = o[field]
    if (v === undefined || v === null) {
      if (required) this.fail(field, 'is required')
      return ''
    }
    if (!isStr(v)) {
      this.fail(field, 'must be text')
      return ''
    }
    if (required && v.trim() === '') this.fail(field, 'must not be empty')
    return v
  }

  day(o: Obj, field: string): string {
    const v = o[field]
    if (!isDayKey(v)) this.fail(field, 'must be a date like 2026-11-05')
    return isStr(v) ? v : ''
  }

  optNum(o: Obj, field: string, min?: number, max?: number): number | null {
    const v = o[field]
    if (v === undefined || v === null) return null
    if (!isNum(v)) {
      this.fail(field, 'must be a number or null')
      return null
    }
    if ((min != null && v < min) || (max != null && v > max)) {
      this.fail(field, `must be between ${min ?? '−∞'} and ${max ?? '∞'}`)
    }
    return v
  }

  rating(o: Obj, field: string): Rating {
    const v = o[field]
    if (!isRating(v)) {
      this.fail(field, 'must be a whole number from 1 to 5')
      return 3
    }
    return v
  }

  optRating(o: Obj, field: string): Rating | null {
    const v = o[field]
    if (v === undefined || v === null) return null
    return this.rating(o, field)
  }
}

function checkList<T>(
  input: unknown,
  name: string,
  parse: (o: Obj, c: Checker) => T,
  errors: string[],
): T[] {
  if (input === undefined) return []
  if (!Array.isArray(input)) {
    errors.push(`${name} must be a list`)
    return []
  }
  const ids = new Set<string>()
  return input.map((item, i) => {
    const c = new Checker(`${name}[${i}]`)
    if (!isObj(item)) {
      errors.push(`${name}[${i}] must be an object`)
      return null as T
    }
    const parsed = parse(item, c)
    const id = (parsed as { id: string }).id
    if (ids.has(id)) c.fail('id', 'is duplicated')
    ids.add(id)
    errors.push(...c.errors)
    return parsed
  })
}

const parseTask = (o: Obj, c: Checker): Task => {
  const category = o.category
  if (!isCategoryId(category)) c.fail('category', 'is not a known category')
  if (o.completed !== undefined && typeof o.completed !== 'boolean') c.fail('completed', 'must be true or false')
  return {
    id: c.str(o, 'id', { required: true }),
    date: c.day(o, 'date'),
    title: c.str(o, 'title', { required: true }),
    category: isCategoryId(category) ? category : 'math',
    plannedMinutes: c.optNum(o, 'plannedMinutes', 0, 24 * 60),
    notes: c.str(o, 'notes'),
    completed: o.completed === true,
    completedAt: isStr(o.completedAt) ? o.completedAt : null,
    createdAt: c.str(o, 'createdAt') || new Date().toISOString(),
  }
}

const parseAttempt = (o: Obj, c: Checker): Attempt => {
  const category = o.category
  if (!isCategoryId(category)) c.fail('category', 'is not a known category')
  const rawScore = c.optNum(o, 'rawScore', 0)
  const maxScore = c.optNum(o, 'maxScore', 0)
  if (rawScore != null && maxScore != null && rawScore > maxScore) c.fail('rawScore', 'is larger than maxScore')
  return {
    id: c.str(o, 'id', { required: true }),
    name: c.str(o, 'name', { required: true }),
    category: isCategoryId(category) ? category : 'math',
    date: c.day(o, 'date'),
    rawScore,
    maxScore,
    rawUnit: c.str(o, 'rawUnit'),
    percentage: c.optNum(o, 'percentage', 0, 100),
    sten: c.optNum(o, 'sten', 1, 10),
    scaledScore: c.optNum(o, 'scaledScore', 0),
    durationMinutes: c.optNum(o, 'durationMinutes', 0, 24 * 60),
    fatigue: c.optRating(o, 'fatigue'),
    difficulty: c.optRating(o, 'difficulty'),
    notes: c.str(o, 'notes'),
    lessons: c.str(o, 'lessons'),
    createdAt: c.str(o, 'createdAt') || new Date().toISOString(),
  }
}

const parseSession = (o: Obj, c: Checker): Session => {
  const category = o.category
  if (category != null && !isCategoryId(category)) c.fail('category', 'is not a known category')
  const duration = c.optNum(o, 'durationMinutes', 0, 24 * 60)
  if (duration == null) c.fail('durationMinutes', 'is required')
  return {
    id: c.str(o, 'id', { required: true }),
    date: c.day(o, 'date'),
    taskId: isStr(o.taskId) ? o.taskId : null,
    category: isCategoryId(category) ? category : null,
    energyBefore: c.rating(o, 'energyBefore'),
    energyAfter: c.rating(o, 'energyAfter'),
    concentration: c.rating(o, 'concentration'),
    durationMinutes: duration ?? 0,
    notes: c.str(o, 'notes'),
    createdAt: c.str(o, 'createdAt') || new Date().toISOString(),
  }
}

const parseJournal = (o: Obj, c: Checker): JournalEntry => {
  const category = o.category
  if (category != null && !isCategoryId(category)) c.fail('category', 'is not a known category')
  const now = new Date().toISOString()
  return {
    id: c.str(o, 'id', { required: true }),
    date: c.day(o, 'date'),
    category: isCategoryId(category) ? category : null,
    wentWell: c.str(o, 'wentWell'),
    difficult: c.str(o, 'difficult'),
    learned: c.str(o, 'learned'),
    changeNext: c.str(o, 'changeNext'),
    createdAt: c.str(o, 'createdAt') || now,
    updatedAt: c.str(o, 'updatedAt') || now,
  }
}

function parseSettings(input: unknown, errors: string[]): Settings {
  if (input === undefined) return { ...DEFAULT_SETTINGS }
  if (!isObj(input)) {
    errors.push('settings must be an object')
    return { ...DEFAULT_SETTINGS }
  }
  const c = new Checker('settings')
  const assessmentDate = input.assessmentDate === undefined ? DEFAULT_SETTINGS.assessmentDate : c.day(input, 'assessmentDate')
  const week = input.weekStartsOn
  if (week !== undefined && week !== 0 && week !== 1) c.fail('weekStartsOn', 'must be 0 (Sunday) or 1 (Monday)')
  const settings: Settings = {
    callsign: c.str(input, 'callsign').slice(0, 40),
    assessmentDate,
    weekStartsOn: week === 0 ? 0 : 1,
  }
  errors.push(...c.errors)
  return settings
}

export function validateAppData(input: unknown): ValidationResult {
  if (!isObj(input)) return { ok: false, errors: ['The file is not a CADET OS data object.'] }
  if (input.schemaVersion !== SCHEMA_VERSION) {
    return {
      ok: false,
      errors: [`Unsupported data version (${String(input.schemaVersion)}). Expected version ${SCHEMA_VERSION}.`],
    }
  }
  const errors: string[] = []
  const data: AppData = {
    schemaVersion: SCHEMA_VERSION,
    tasks: checkList(input.tasks, 'tasks', parseTask, errors),
    attempts: checkList(input.attempts, 'attempts', parseAttempt, errors),
    sessions: checkList(input.sessions, 'sessions', parseSession, errors),
    journal: checkList(input.journal, 'journal', parseJournal, errors),
    settings: parseSettings(input.settings, errors),
  }
  return errors.length ? { ok: false, errors } : { ok: true, data }
}

export function parseImportText(text: string): ValidationResult {
  let json: unknown
  try {
    json = JSON.parse(text)
  } catch {
    return { ok: false, errors: ['The file is not valid JSON.'] }
  }
  return validateAppData(json)
}
