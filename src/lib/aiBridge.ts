import { addDays, subDays } from 'date-fns'
import { SCHEMA_VERSION, type AppData, type Attempt, type JournalEntry, type Task } from '../types'
import { CATEGORIES } from './categories'
import { toDayKey } from './dates'
import { newId } from './ids'
import { DEFAULT_SETTINGS } from './seed'
import { validateAppData } from './validate'

/*
 * Copy-paste bridge for any chat AI (ChatGPT, Claude, Gemini…).
 * "Copy for AI" produces a prompt with the rules, the reply format and a
 * snapshot of the student's data. The AI answers with one JSON block; pasting
 * that answer back adds tasks, journal notes or results after a preview.
 * The app is never modified — the AI only ever proposes data.
 */

export interface AiItems {
  tasks: Task[]
  journal: JournalEntry[]
  attempts: Attempt[]
}

export type AiParseResult = { ok: true; items: AiItems } | { ok: false; errors: string[] }

export function buildAiPrompt(data: AppData, now: Date = new Date()): string {
  const today = toDayKey(now)
  const from = toDayKey(subDays(now, 14))
  const to = toDayKey(addDays(now, 45))
  const strip = <T extends { id: string; createdAt: string }>(x: T) => {
    const { id: _id, createdAt: _c, ...rest } = x
    return rest
  }
  const snapshot = {
    today,
    assessmentDate: data.settings.assessmentDate,
    results: data.attempts.map(strip),
    tasks: data.tasks.filter((t) => t.date >= from && t.date <= to).map((t) => {
      const { completedAt: _done, ...rest } = strip(t)
      return rest
    }),
    checkIns: data.sessions.filter((s) => s.date >= from).map(({ date, durationMinutes, energyBefore, energyAfter, concentration, category }) => ({
      date,
      durationMinutes,
      energyBefore,
      energyAfter,
      concentration,
      category,
    })),
    recentJournal: [...data.journal]
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, 10)
      .map(({ date, category, wentWell, difficult, learned, changeNext }) => ({ date, category, wentWell, difficult, learned, changeNext })),
  }

  return `You are helping a student prepare for the Air Astana Ab-Initio pilot selection assessment on ${data.settings.assessmentDate}. Today is ${today}.
They track training in an app called CADET OS. Below is a snapshot of their data. Help with what they ask (training plans, calendar tasks, notes, reading a result screenshot), then give anything they should add to the app as ONE JSON block in the format below.

RULES
- Never invent scores. Only include "attempts" when the student gave you real results (text or a screenshot of a results screen). Leave unknown fields out.
- Keep scoring scales separate: percentage (0–100), sten (whole number 1–10), scaledScore, and rawScore with maxScore and rawUnit (e.g. "weighted marks", "s on target"). Do not convert one into another.
- APQ is a personality questionnaire, not performance — never treat it as a score to improve.
- Plans should be realistic: include rest/recovery days, avoid overloading, sessions usually 20–90 minutes.
- Dates are "YYYY-MM-DD". Only use these category ids: ${CATEGORIES.map((c) => `${c.id} (${c.label})`).join(', ')}.
- Practice scores show progress; they do not predict the airline's decision. Don't claim they do.

REPLY FORMAT (include only the lists you need; the student pastes this into CADET OS)
\`\`\`json
{
  "cadetos": 1,
  "tasks": [
    { "date": "YYYY-MM-DD", "title": "Short task title", "category": "math", "plannedMinutes": 45, "notes": "optional" }
  ],
  "journal": [
    { "date": "YYYY-MM-DD", "category": "coordination", "wentWell": "", "difficult": "", "learned": "", "changeNext": "" }
  ],
  "attempts": [
    { "date": "YYYY-MM-DD", "name": "Mathematics practice test", "category": "math", "percentage": 88, "sten": 9, "rawScore": 44, "maxScore": 50, "rawUnit": "weighted marks", "durationMinutes": 30, "notes": "mistakes", "lessons": "" }
  ]
}
\`\`\`

STUDENT DATA
\`\`\`json
${JSON.stringify(snapshot, null, 2)}
\`\`\`

What would you like help with? (Wait for the student's request before producing the JSON block.)`
}

function extractJson(text: string): unknown {
  const fenced = [...text.matchAll(/```(?:json)?\s*([\s\S]*?)```/g)].map((m) => m[1])
  const candidates = fenced.length ? fenced : [text.slice(text.indexOf('{'), text.lastIndexOf('}') + 1)]
  for (const c of candidates) {
    try {
      const value = JSON.parse(c)
      if (value && typeof value === 'object' && 'cadetos' in value) return value
    } catch {
      // try the next block
    }
  }
  return null
}

const asList = (v: unknown): Record<string, unknown>[] =>
  Array.isArray(v) ? v.filter((x): x is Record<string, unknown> => typeof x === 'object' && x !== null) : []

export function parseAiReply(text: string): AiParseResult {
  const json = extractJson(text) as Record<string, unknown> | null
  if (!json) {
    return {
      ok: false,
      errors: ['No CADET OS data block found. Paste the AI’s whole reply — it should contain a JSON block starting with {"cadetos": 1.'],
    }
  }
  const now = new Date().toISOString()
  const tasks = asList(json.tasks).map((t) => ({
    notes: '',
    plannedMinutes: null,
    ...t,
    id: newId('task'),
    completed: false,
    completedAt: null,
    createdAt: now,
  }))
  const journal = asList(json.journal).map((j) => ({
    category: null,
    wentWell: '',
    difficult: '',
    learned: '',
    changeNext: '',
    ...j,
    id: newId('jrn'),
    createdAt: now,
    updatedAt: now,
  }))
  const attempts = asList(json.attempts).map((a) => ({
    rawScore: null,
    maxScore: null,
    rawUnit: a.rawScore != null ? 'marks' : '',
    percentage: null,
    sten: null,
    scaledScore: null,
    durationMinutes: null,
    fatigue: null,
    difficulty: null,
    notes: '',
    lessons: '',
    ...a,
    id: newId('att'),
    createdAt: now,
  }))

  if (!tasks.length && !journal.length && !attempts.length) {
    return { ok: false, errors: ['The block is empty — there is nothing to add.'] }
  }

  // Reuse the strict import validator so AI output meets exactly the same rules as a backup file.
  const result = validateAppData({ schemaVersion: SCHEMA_VERSION, tasks, journal, attempts, sessions: [], settings: DEFAULT_SETTINGS })
  if (!result.ok) return { ok: false, errors: result.errors }
  const noScore = result.data.attempts.filter((a) => a.percentage == null && a.sten == null && a.scaledScore == null && a.rawScore == null)
  if (noScore.length) return { ok: false, errors: [`${noScore.length} result(s) have no score at all. Results need at least one real score.`] }
  return { ok: true, items: { tasks: result.data.tasks, journal: result.data.journal, attempts: result.data.attempts } }
}

const norm = (s: string) => s.trim().toLowerCase()

/** Removes items that already exist, so pasting the same reply twice doesn't duplicate anything. */
export function dedupe(items: AiItems, data: AppData): { items: AiItems; skipped: number } {
  const taskKeys = new Set(data.tasks.map((t) => `${t.date}|${norm(t.title)}`))
  const attemptKeys = new Set(data.attempts.map((a) => `${a.date}|${a.category}|${norm(a.name)}`))
  const journalKeys = new Set(data.journal.map((j) => `${j.date}|${norm(j.wentWell + j.difficult + j.learned + j.changeNext)}`))
  const tasks = items.tasks.filter((t) => !taskKeys.has(`${t.date}|${norm(t.title)}`))
  const attempts = items.attempts.filter((a) => !attemptKeys.has(`${a.date}|${a.category}|${norm(a.name)}`))
  const journal = items.journal.filter((j) => !journalKeys.has(`${j.date}|${norm(j.wentWell + j.difficult + j.learned + j.changeNext)}`))
  const skipped = items.tasks.length - tasks.length + items.attempts.length - attempts.length + items.journal.length - journal.length
  return { items: { tasks, journal, attempts }, skipped }
}
