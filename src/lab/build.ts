import type { Rng } from './rng'
import type { Diagram, Difficulty, Question, QuestionKey, Subject, Topic } from './types'

/*
 * Templates return a Draft: the question, the independently computed answer and
 * a list of *plausible* wrong answers (the result of a typical mistake). The
 * builder turns that into four unique choices with the answer in the requested
 * slot, and every question is validated before it can be shown.
 */

interface DraftBase {
  text: string
  explanation: string[]
  formula?: string
  diagram?: Diagram
  given?: string
  expectedSeconds: number
}

export interface NumericDraft extends DraftBase {
  kind: 'numeric'
  value: number
  format: (v: number) => string
  /** Values a candidate gets from a common mistake, most convincing first. */
  traps: (number | null | undefined)[]
  /** Spacing for filler choices and the minimum gap between any two choices. */
  step: number
  /** Smallest value a choice may take (e.g. 0 for a length). Default 0. */
  min?: number
  /** Largest value a choice may take (e.g. 1439 for a clock time). */
  max?: number
}

export interface TextDraft extends DraftBase {
  kind: 'text'
  correct: string
  /** At least three wrong statements; the builder picks three. */
  wrong: string[]
  /** Keep this exact order instead of shuffling (e.g. A/B/C/D labels on a diagram). */
  fixedOrder?: string[]
}

export type Draft = NumericDraft | TextDraft

export interface Template {
  id: string
  subject: Subject
  topic: Topic
  levels: Difficulty[]
  /** Return null to reject the drawn parameters; the engine draws again. */
  make(r: Rng, d: Difficulty): Draft | null
}

/* ---------- formatting ---------- */

/** 1,800 / 2.5 / 0.75 — at most `dp` decimals, trailing zeros removed, thousands separated. */
export function num(v: number, dp = 2): string {
  const rounded = Number(v.toFixed(dp))
  const [int, frac] = Math.abs(rounded).toString().split('.')
  const withSep = int.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
  return `${rounded < 0 ? '−' : ''}${withSep}${frac ? '.' + frac : ''}`
}

/** Fixed decimals (keeps trailing zeros), for answers stated "to 1 decimal place". */
export function fixed(v: number, dp: number): string {
  const s = Math.abs(v).toFixed(dp)
  const [int, frac] = s.split('.')
  return `${v < 0 ? '−' : ''}${int.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}${frac ? '.' + frac : ''}`
}

export const unit = (u: string, dp = 2) => (v: number) => `${num(v, dp)} ${u}`

/** 100 → "1 h 40 min", 45 → "45 min", 120 → "2 h". */
export function hm(totalMinutes: number): string {
  const m = Math.round(totalMinutes)
  const h = Math.floor(m / 60)
  const r = m % 60
  if (h === 0) return `${r} min`
  return r === 0 ? `${h} h` : `${h} h ${r} min`
}

/** Minutes after midnight → "07:05" (wraps around the day). */
export function clock(minutes: number): string {
  const m = ((Math.round(minutes) % 1440) + 1440) % 1440
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`
}

export function round(v: number, dp: number): number {
  return Number(v.toFixed(dp))
}

/** Roughly 8% of the value, snapped to 1/2/5 × 10ⁿ, never below `floor`. */
export function stepFor(v: number, floor = 1): number {
  const x = Math.abs(v) * 0.08
  if (x <= floor) return floor
  const p = 10 ** Math.floor(Math.log10(x))
  const m = x / p
  return Math.max(floor, (m >= 5 ? 5 : m >= 2 ? 2 : 1) * p)
}

/** Pick by difficulty. */
export function by<T>(d: Difficulty, basic: T, intermediate: T, advanced: T): T {
  return d === 1 ? basic : d === 2 ? intermediate : advanced
}

/* ---------- building ---------- */

const EPS = 1e-9

function buildNumeric(d: NumericDraft, slot: number, r: Rng): { choices: string[]; answer: number } | null {
  const c = d.value
  // Without an explicit minimum, every choice must be positive (lengths, masses, times…).
  const min = d.min ?? EPS * 10
  const max = d.max ?? Infinity
  if (!Number.isFinite(c) || c < min - EPS || c > max) return null
  // A wrong answer with far more decimals than the answer stands out, so drop it.
  const decimals = (v: number) => (round(v, 6).toString().split('.')[1] ?? '').length
  const precise = (v: number) => decimals(v) <= Math.max(1, decimals(c) + 1)
  const gap = d.step * 0.5
  const correctText = d.format(c)
  const taken: number[] = [c]
  const texts = new Set([correctText])

  const fits = (v: number) =>
    Number.isFinite(v) &&
    v >= min - EPS &&
    v <= max + EPS &&
    taken.every((t) => Math.abs(t - v) >= gap - EPS) &&
    !texts.has(d.format(v))
  const take = (v: number) => {
    taken.push(v)
    texts.add(d.format(v))
  }

  const below: number[] = []
  const above: number[] = []
  for (const t of d.traps) {
    if (t == null || !fits(t) || !precise(t)) continue
    if (t < c && below.length < 3) {
      below.push(t)
      take(t)
    } else if (t > c && above.length < 3) {
      above.push(t)
      take(t)
    }
  }

  // The answer's slot is the number of choices below it (choices are shown in ascending order).
  // Prefer the requested slot, otherwise the nearest feasible one.
  const order = [slot, slot - 1, slot + 1, slot - 2, slot + 2, slot - 3, slot + 3].filter((s) => s >= 0 && s <= 3)
  for (const target of order) {
    const lo = below.slice(0, target)
    const hi = above.slice(0, 3 - target)
    // Release the traps we are not using so fillers can sit where they were.
    const keep = new Set([c, ...lo, ...hi])
    const localTaken = taken.filter((t) => keep.has(t))
    const localTexts = new Set(localTaken.map((t) => d.format(t)))
    const ok = (v: number) =>
      Number.isFinite(v) &&
      v >= min - EPS &&
      v <= max + EPS &&
      localTaken.every((t) => Math.abs(t - v) >= gap - EPS) &&
      !localTexts.has(d.format(v))
    const add = (v: number) => {
      localTaken.push(v)
      localTexts.add(d.format(v))
    }
    // Fillers sit near the answer (not near a trap), in a shuffled order of steps, so the
    // answer is never the odd one out and the choices don't form a regular ladder.
    const ks = [...r.shuffle([1, 2, 3]), 4, 5, 6, 7, 8]
    for (const k of ks) {
      if (lo.length >= target) break
      const v = c - d.step * k
      if (ok(v)) {
        lo.push(v)
        add(v)
      }
    }
    for (const k of ks) {
      if (hi.length >= 3 - target) break
      const v = c + d.step * k
      if (ok(v)) {
        hi.push(v)
        add(v)
      }
    }
    if (lo.length === target && hi.length === 3 - target) {
      const values = [...lo, c, ...hi].sort((a, b) => a - b)
      return { choices: values.map(d.format), answer: values.indexOf(c) }
    }
  }
  return null
}

function buildText(d: TextDraft, slot: number, r: Rng): { choices: string[]; answer: number } | null {
  if (d.fixedOrder) {
    const answer = d.fixedOrder.indexOf(d.correct)
    return answer < 0 ? null : { choices: d.fixedOrder, answer }
  }
  const wrong = r.shuffle([...new Set(d.wrong.filter((w) => w !== d.correct))]).slice(0, 3)
  if (wrong.length < 3) return null
  const choices = [...wrong]
  choices.splice(slot, 0, d.correct)
  // Numeric statements read best in ascending order, as in the numeric questions.
  const value = (c: string) => Number(c.replace(/,/g, '').replace('−', '-').match(/^-?\d+(\.\d+)?/)?.[0])
  if (choices.every((c) => !Number.isNaN(value(c)))) {
    choices.sort((a, b) => value(a) - value(b))
    return { choices, answer: choices.indexOf(d.correct) }
  }
  return { choices, answer: slot }
}

export function finalize(t: Template, key: QuestionKey, draft: Draft, r: Rng): Question | null {
  const built = draft.kind === 'numeric' ? buildNumeric(draft, key.slot, r) : buildText(draft, key.slot, r)
  if (!built) return null
  const q: Question = {
    id: `${t.id}-${key.difficulty}-${key.seed.toString(36)}`,
    key,
    subject: t.subject,
    topic: t.topic,
    difficulty: key.difficulty,
    text: articles(draft.text),
    choices: built.choices as Question['choices'],
    answer: built.answer as Question['answer'],
    explanation: draft.explanation,
    formula: draft.formula,
    diagram: draft.diagram,
    expectedSeconds: draft.expectedSeconds,
    given: draft.given,
  }
  return validateQuestion(q).length === 0 ? q : null
}

/** "a 8 kg mass" → "an 8 kg mass", "a 18 V battery" → "an 18 V battery". */
function articles(text: string): string {
  return text.replace(/\b([Aa]) (\d[\d,]*(?:\.\d+)?)/g, (m, a: string, n: string) => {
    const int = n.split('.')[0].replace(/,/g, '')
    const vowel = int.startsWith('8') || ((int.length === 2 || int.length === 5) && /^1[18]/.test(int))
    return vowel ? `${a}n ${n}` : m
  })
}

const BAD_TEXT = /NaN|Infinity|undefined|null|\[object/

/** Structural checks every question must pass before it is shown. */
export function validateQuestion(q: Question): string[] {
  const errors: string[] = []
  if (!q.text.trim()) errors.push('empty question text')
  if (q.choices.length !== 4) errors.push('needs four choices')
  if (new Set(q.choices.map((c) => c.trim().toLowerCase())).size !== q.choices.length) errors.push('duplicate choices')
  if (q.choices.some((c) => !c.trim())) errors.push('empty choice')
  if (!(q.answer >= 0 && q.answer <= 3)) errors.push('answer out of range')
  if (!q.explanation.length) errors.push('no explanation')
  const all = [q.text, ...q.choices, ...q.explanation, q.formula ?? '', q.given ?? ''].join(' ')
  if (BAD_TEXT.test(all)) errors.push(`broken value in text: ${all.match(BAD_TEXT)?.[0]}`)
  if (!(q.expectedSeconds > 0)) errors.push('no expected time')
  return errors
}
