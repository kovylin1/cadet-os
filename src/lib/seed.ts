import { SCHEMA_VERSION, type AppData, type Attempt, type Settings } from '../types'

export const DEFAULT_ASSESSMENT_DATE = '2026-11-05'

export const DEFAULT_SETTINGS: Settings = {
  callsign: '',
  assessmentDate: DEFAULT_ASSESSMENT_DATE,
  weekStartsOn: 1,
}

/*
 * The student's real practice results from 13 October 2026, exactly as reported.
 * Fields that weren't reported (fatigue, difficulty, test length for the written
 * papers) stay empty rather than being guessed. FAST has no score yet on purpose.
 */
const SEED_ATTEMPTS: Attempt[] = [
  {
    id: 'seed_math_1',
    name: 'Mathematics practice test',
    category: 'math',
    date: '2026-10-13',
    rawScore: 44,
    maxScore: 50,
    rawUnit: 'weighted marks',
    percentage: 88,
    sten: 9,
    scaledScore: null,
    durationMinutes: null,
    fatigue: null,
    difficulty: null,
    notes:
      'Three mistakes: fuel reserve, pounds-to-kilograms conversion, and train departure timing.',
    lessons: '',
    createdAt: '2026-10-13T09:00:00.000Z',
  },
  {
    id: 'seed_physics_1',
    name: 'Physics practice test',
    category: 'physics',
    date: '2026-10-13',
    rawScore: 49,
    maxScore: 50,
    rawUnit: 'weighted marks',
    percentage: 98,
    sten: 10,
    scaledScore: null,
    durationMinutes: null,
    fatigue: null,
    difficulty: null,
    notes: 'One mistake involving particle diagrams.',
    lessons: '',
    createdAt: '2026-10-13T10:00:00.000Z',
  },
  {
    id: 'seed_coord_1',
    name: 'Coordination & Control — attempt 1',
    category: 'coordination',
    date: '2026-10-13',
    rawScore: 69.6,
    maxScore: 180,
    rawUnit: 's on target',
    percentage: null,
    sten: 4,
    scaledScore: 174,
    durationMinutes: 3,
    fatigue: null,
    difficulty: null,
    notes: 'Excessive corrections and chasing the ball.',
    lessons: '',
    createdAt: '2026-10-13T11:00:00.000Z',
  },
  {
    id: 'seed_coord_2',
    name: 'Coordination & Control — attempt 2',
    category: 'coordination',
    date: '2026-10-13',
    rawScore: 80,
    maxScore: 180,
    rawUnit: 's on target',
    percentage: null,
    sten: 5,
    scaledScore: 200,
    durationMinutes: 3,
    fatigue: null,
    difficulty: null,
    notes: 'Smaller corrections and better anticipation improved performance.',
    lessons: '',
    createdAt: '2026-10-13T11:10:00.000Z',
  },
]

export function createSeedData(): AppData {
  return {
    schemaVersion: SCHEMA_VERSION,
    tasks: [],
    attempts: SEED_ATTEMPTS.map((a) => ({ ...a })),
    sessions: [],
    journal: [],
    lab: [],
    settings: { ...DEFAULT_SETTINGS },
  }
}

export function createEmptyData(settings: Settings = DEFAULT_SETTINGS): AppData {
  return {
    schemaVersion: SCHEMA_VERSION,
    tasks: [],
    attempts: [],
    sessions: [],
    journal: [],
    lab: [],
    settings: { ...settings },
  }
}
