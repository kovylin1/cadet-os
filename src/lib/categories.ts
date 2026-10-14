import {
  Atom,
  Brain,
  Calculator,
  ClipboardCheck,
  Crosshair,
  Languages,
  Layers,
  Moon,
  UserRound,
  type LucideIcon,
} from 'lucide-react'
import type { CategoryId } from '../types'

export interface CategoryMeta {
  id: CategoryId
  label: string
  short: string
  icon: LucideIcon
  /** Whether attempts in this category are aptitude performance that can be scored and trended. */
  scorable: boolean
}

/*
 * Categories are identified by icon + label, never by colour alone. Nine hues
 * would blow past the palette limit and be indistinguishable for colour-blind
 * users, so the calendar and lists use neutral chips with an icon.
 */
export const CATEGORIES: CategoryMeta[] = [
  { id: 'math', label: 'Mathematics', short: 'Maths', icon: Calculator, scorable: true },
  { id: 'physics', label: 'Physics', short: 'Physics', icon: Atom, scorable: true },
  { id: 'fast', label: 'FAST / Multitasking', short: 'FAST', icon: Layers, scorable: true },
  { id: 'coordination', label: 'Coordination & Control', short: 'Coordination', icon: Crosshair, scorable: true },
  { id: 'english', label: 'English', short: 'English', icon: Languages, scorable: true },
  { id: 'cognitive', label: 'Cognitive Aptitude', short: 'Cognitive', icon: Brain, scorable: true },
  // APQ is a personality questionnaire: there is no "better" score, so it is never trended as performance.
  { id: 'apq', label: 'APQ / Personality Vocabulary', short: 'APQ', icon: UserRound, scorable: false },
  { id: 'mock', label: 'Mock Assessment', short: 'Mock', icon: ClipboardCheck, scorable: true },
  { id: 'rest', label: 'Rest / Recovery', short: 'Rest', icon: Moon, scorable: false },
]

const BY_ID = new Map(CATEGORIES.map((c) => [c.id, c]))

export function category(id: CategoryId): CategoryMeta {
  return BY_ID.get(id) ?? CATEGORIES[0]
}

export const SCORABLE_CATEGORIES = CATEGORIES.filter((c) => c.scorable)

export function isCategoryId(value: unknown): value is CategoryId {
  return typeof value === 'string' && BY_ID.has(value as CategoryId)
}
