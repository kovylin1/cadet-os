import { isValid, parse } from 'date-fns'
import type { CategoryId } from '../types'
import { toDayKey } from './dates'

/*
 * Pulls score fields out of the text of a result screen or report (pasted
 * text, a PDF's text layer, or OCR output). It only reports what it can find
 * next to a recognisable label — anything ambiguous is left for the user, so a
 * misread never turns into an invented score.
 */

export interface ParsedFields {
  category?: CategoryId
  date?: string
  percentage?: number
  sten?: number
  scaledScore?: number
  rawScore?: number
  maxScore?: number
  rawUnit?: string
  durationMinutes?: number
}

export interface ParseResult {
  fields: ParsedFields
  /** Human-readable names of what was recognised, for the confirmation message. */
  found: string[]
}

const NUM = '(\\d+(?:[.,]\\d+)?)'
const num = (s: string) => Number(s.replace(',', '.'))

const CATEGORY_WORDS: [CategoryId, RegExp][] = [
  ['coordination', /coordination|co-ordination|control task|tracking/],
  ['fast', /\bfast\b|multi-?task/],
  ['math', /mathematic|\bmaths?\b|arithmetic|numerical/],
  ['physics', /physics|mechanical/],
  ['english', /english|language|grammar|vocabulary test/],
  ['mock', /mock assessment|full mock/],
  ['cognitive', /cognitive|reasoning|aptitude|spatial|memory/],
]

const DATE_FORMATS = ['yyyy-MM-dd', 'dd/MM/yyyy', 'dd.MM.yyyy', 'd MMMM yyyy', 'd MMM yyyy', 'MMMM d, yyyy', 'MMM d, yyyy', 'MMMM d yyyy']

function findDate(text: string): string | undefined {
  const candidates = text.match(
    /\b(\d{4}-\d{2}-\d{2}|\d{1,2}[./]\d{1,2}[./]\d{4}|\d{1,2}\s+[A-Za-z]{3,9}\s+\d{4}|[A-Za-z]{3,9}\s+\d{1,2},?\s+\d{4})\b/g,
  )
  for (const c of candidates ?? []) {
    const clean = c.replace(/\s+/g, ' ').replace(/^(\d)[./]/, '0$1/').replace(/[.]/g, '/')
    for (const f of DATE_FORMATS) {
      const d = parse(f.includes('.') ? clean.replace(/\//g, '.') : clean, f, new Date())
      if (isValid(d) && d.getFullYear() > 2000 && d.getFullYear() < 2100) return toDayKey(d)
    }
  }
  return undefined
}

export function parseResultText(input: string): ParseResult {
  const text = input.replace(/\s+/g, ' ').trim()
  const lower = text.toLowerCase()
  const fields: ParsedFields = {}
  const found: string[] = []

  const category = CATEGORY_WORDS.find(([, re]) => re.test(lower))?.[0]
  if (category) {
    fields.category = category
    found.push('category')
  }

  const date = findDate(text)
  if (date) {
    fields.date = date
    found.push('date')
  }

  // Sten: "sten 9", "sten score: 9/10", "9/10 sten"
  const sten = lower.match(/sten(?:\s*score)?\s*[:=\-–]?\s*(\d{1,2})(?:\s*\/\s*10)?\b/) ?? lower.match(/\b(\d{1,2})\s*\/\s*10\s*sten/)
  if (sten) {
    const v = Number(sten[1])
    if (v >= 1 && v <= 10) {
      fields.sten = v
      found.push('sten')
    }
  }

  const scaled = lower.match(new RegExp(`scaled(?:\\s*score)?\\s*[:=\\-–]?\\s*${NUM}`))
  if (scaled) {
    fields.scaledScore = num(scaled[1])
    found.push('scaled score')
  }

  const pct = lower.match(new RegExp(`${NUM}\\s*%`))
  if (pct) {
    const v = num(pct[1])
    if (v >= 0 && v <= 100) {
      fields.percentage = v
      found.push('percentage')
    }
  }

  // Test length, e.g. "test duration: 180 seconds", "time taken 25 min"
  const dur = lower.match(new RegExp(`(?:duration|time taken|test time|length)\\s*[:=\\-–]?\\s*${NUM}\\s*(s|sec|secs|seconds|min|mins|minutes)\\b`))
  let durationSeconds: number | undefined
  if (dur) {
    const v = num(dur[1])
    durationSeconds = dur[2].startsWith('s') ? v : v * 60
    fields.durationMinutes = Math.round((durationSeconds / 60) * 10) / 10
    found.push('duration')
  }

  // Raw score: time on target first (coordination), then labelled marks.
  const tot = lower.match(new RegExp(`time on target\\s*[:=\\-–]?\\s*${NUM}\\s*(?:s|sec|seconds)?`))
  if (tot) {
    fields.rawScore = num(tot[1])
    fields.rawUnit = 's on target'
    if (durationSeconds) fields.maxScore = durationSeconds
    found.push('time on target')
  } else {
    const UNIT = '(weighted marks|marks|points|correct|questions)'
    const after = lower.match(new RegExp(`${NUM}\\s*(?:\\/|out of)\\s*${NUM}\\s*${UNIT}`))
    const before = lower.match(new RegExp(`${UNIT}\\s*[:=\\-–]?\\s*${NUM}\\s*(?:\\/|out of)\\s*${NUM}`))
    const raw = after
      ? { value: after[1], max: after[2], unit: after[3] }
      : before
        ? { value: before[2], max: before[3], unit: before[1] }
        : null
    if (raw) {
      const value = num(raw.value)
      const max = num(raw.max)
      if (value <= max && max > 0) {
        fields.rawScore = value
        fields.maxScore = max
        fields.rawUnit = raw.unit === 'questions' ? 'correct' : raw.unit
        found.push('raw score')
      }
    }
  }

  return { fields, found }
}
