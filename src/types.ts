/**
 * Core data model for CADET OS.
 *
 * Dates are stored as local calendar days ("yyyy-MM-dd") so a task planned for
 * "Tuesday" never drifts across time zones. Timestamps (createdAt etc.) are ISO.
 *
 * Every score field is optional and stored in its own unit — percentages, sten,
 * scaled and raw scores are never merged into one number.
 */

export type CategoryId =
  | 'math'
  | 'physics'
  | 'fast'
  | 'coordination'
  | 'english'
  | 'cognitive'
  | 'apq'
  | 'mock'
  | 'rest'

/** 1–5 self-rating (fatigue, difficulty, energy, concentration). */
export type Rating = 1 | 2 | 3 | 4 | 5

export interface Task {
  id: string
  date: string
  title: string
  category: CategoryId
  plannedMinutes: number | null
  notes: string
  completed: boolean
  completedAt: string | null
  createdAt: string
}

export interface Attempt {
  id: string
  name: string
  category: CategoryId
  date: string
  rawScore: number | null
  maxScore: number | null
  /** What the raw score counts, e.g. "marks" or "s on target". */
  rawUnit: string
  percentage: number | null
  sten: number | null
  scaledScore: number | null
  durationMinutes: number | null
  fatigue: Rating | null
  difficulty: Rating | null
  notes: string
  lessons: string
  createdAt: string
}

/** Post-training check-in used for the fatigue/performance view. */
export interface Session {
  id: string
  date: string
  taskId: string | null
  category: CategoryId | null
  energyBefore: Rating
  energyAfter: Rating
  concentration: Rating
  durationMinutes: number
  notes: string
  createdAt: string
}

export interface JournalEntry {
  id: string
  date: string
  category: CategoryId | null
  wentWell: string
  difficult: string
  learned: string
  changeNext: string
  createdAt: string
  updatedAt: string
}

export interface Settings {
  callsign: string
  assessmentDate: string
  weekStartsOn: 0 | 1
}

export const SCHEMA_VERSION = 1

export interface AppData {
  schemaVersion: typeof SCHEMA_VERSION
  tasks: Task[]
  attempts: Attempt[]
  sessions: Session[]
  journal: JournalEntry[]
  settings: Settings
}
