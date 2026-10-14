import { tryGenerate } from './engine'
import type { Question, QuestionKey, TestConfig } from './types'

/*
 * The test in progress is saved after every change under its own key, so a
 * reload or a closed tab never loses answers. It is separate from AppData:
 * it is transient, and only the finished result goes into the main data.
 */

export interface ActiveTest {
  id: string
  config: TestConfig
  keys: QuestionKey[]
  answers: (number | null)[]
  flags: boolean[]
  /** Answer revealed with "Check answer" (untimed practice only). */
  checked: boolean[]
  timeMs: number[]
  current: number
  startedAt: string
  /** Epoch ms when time runs out, or null for untimed practice. */
  deadline: number | null
}

const KEY = 'cadet-os:lab-active'

export function loadActive(): { test: ActiveTest; questions: Question[] } | null {
  let raw: string | null = null
  try {
    raw = window.localStorage.getItem(KEY)
  } catch {
    return null
  }
  if (!raw) return null
  try {
    const t = JSON.parse(raw) as ActiveTest
    const n = t.keys?.length
    const ok =
      n > 0 &&
      [t.answers, t.flags, t.checked, t.timeMs].every((a) => Array.isArray(a) && a.length === n) &&
      typeof t.current === 'number' &&
      t.config &&
      typeof t.id === 'string'
    if (!ok) throw new Error('shape')
    const questions = t.keys.map(tryGenerate)
    if (questions.some((q) => !q)) throw new Error('regenerate')
    return { test: { ...t, current: Math.min(Math.max(0, t.current), n - 1) }, questions: questions as Question[] }
  } catch {
    clearActive()
    return null
  }
}

export function saveActive(test: ActiveTest): boolean {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(test))
    return true
  } catch {
    return false
  }
}

export function clearActive() {
  try {
    window.localStorage.removeItem(KEY)
  } catch {
    // storage blocked — nothing to clear
  }
}
