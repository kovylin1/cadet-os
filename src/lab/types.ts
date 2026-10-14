/*
 * Aptitude Lab — generated practice questions.
 *
 * A question is never stored: only its key (template + difficulty + seed) is.
 * Re-running the template with the same key rebuilds the identical question,
 * which keeps saved results small and makes every test reproducible.
 */

export type Subject = 'math' | 'physics'
export type TestSubject = Subject | 'combined'
export type Difficulty = 1 | 2 | 3
export type DifficultyMode = 'basic' | 'intermediate' | 'advanced' | 'adaptive'
export type TimeMode = 'untimed' | 'timed' | 'speed'

export const DIFFICULTY_LABEL: Record<Difficulty, string> = { 1: 'Basic', 2: 'Intermediate', 3: 'Advanced' }

export type MathTopic =
  | 'arithmetic'
  | 'fractions'
  | 'sdt'
  | 'fuel'
  | 'units'
  | 'time'
  | 'algebra'
  | 'averages'
  | 'data'
  | 'geometry'

export type PhysicsTopic =
  | 'newton'
  | 'forces'
  | 'motion'
  | 'energy'
  | 'momentum'
  | 'pressure'
  | 'aero'
  | 'electricity'
  | 'heat'
  | 'waves'
  | 'machines'
  | 'particles'

export type Topic = MathTopic | PhysicsTopic

/* ---------- Diagrams (rendered as SVG from these data, never from images) ---------- */

export type Dir = 'up' | 'down' | 'left' | 'right'

export type Diagram =
  | { kind: 'forces'; body: string; arrows: { dir: Dir; label: string }[] }
  | {
      kind: 'lever'
      /** Beam length in metres; positions are measured from the left end. */
      length: number
      pivot: number
      loads: { at: number; label: string; dir: 'down' | 'up' }[]
      marks: { from: number; to: number; label: string }[]
    }
  | { kind: 'pulley'; strands: number; load: string; effort: string }
  | { kind: 'circuit'; layout: 'series' | 'parallel'; source: string; resistors: string[]; meter?: string }
  | {
      kind: 'graph'
      title: string
      xLabel: string
      yLabel: string
      xMax: number
      yMax: number
      xStep: number
      yStep: number
      points: [number, number][]
      /** Optional segment labels placed mid-segment (A, B, C…). */
      segmentLabels?: string[]
    }
  | { kind: 'bars'; title: string; unit: string; labels: string[]; values: number[]; yMax: number; yStep: number }
  | { kind: 'table'; title: string; headers: string[]; rows: string[][] }
  | {
      kind: 'triangle'
      /** Labels for the vertical leg, horizontal leg and hypotenuse (empty = unlabelled). */
      vertical: string
      horizontal: string
      hypotenuse: string
      angle?: string
    }
  | { kind: 'particles'; boxes: { label: string; state: 'solid' | 'liquid' | 'gas' }[] }
  | {
      kind: 'wave'
      cycles: number
      /** Horizontal span the drawn waves cover, with its label (e.g. "6.0 m"). */
      spanLabel: string
      amplitudeLabel?: string
    }

/* ---------- Questions ---------- */

export interface QuestionKey {
  templateId: string
  difficulty: Difficulty
  seed: number
  /** Which slot (0–3) the correct answer should occupy; keeps A–D balanced across a test. */
  slot: number
}

export interface Question {
  id: string
  key: QuestionKey
  subject: Subject
  topic: Topic
  difficulty: Difficulty
  text: string
  choices: [string, string, string, string]
  answer: 0 | 1 | 2 | 3
  /** Worked solution, one step per entry. */
  explanation: string[]
  formula?: string
  diagram?: Diagram
  expectedSeconds: number
  /** Assumptions or constants stated with the question (g = 10 m/s², 1 NM = 1.852 km…). */
  given?: string
}

/* ---------- Tests and results ---------- */

export interface TestConfig {
  subject: TestSubject
  count: 10 | 20 | 30 | 50
  difficulty: DifficultyMode
  /** Empty = all topics of the chosen subject(s). */
  topics: Topic[]
  timeMode: TimeMode
  /** Total minutes for timed / speed modes. */
  minutes: number
  calculator: boolean
  /** Topic weights for "practice my weak areas" (topic → weight). */
  weights?: Partial<Record<Topic, number>>
}

export interface ResultItem {
  key: QuestionKey
  subject: Subject
  topic: Topic
  difficulty: Difficulty
  /** Index of the chosen answer, or null if unanswered. */
  choice: number | null
  answer: number
  timeMs: number
  /** Expected solving time in seconds (from the template), used for pace. */
  expected: number
  flagged: boolean
  /** True when the answer was revealed with Check Answer before submitting (practice mode). */
  checked: boolean
}

export interface LabResult {
  id: string
  generatorVersion: number
  date: string
  startedAt: string
  finishedAt: string
  config: TestConfig
  durationSec: number
  endReason: 'submitted' | 'time'
  items: ResultItem[]
}
