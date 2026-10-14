import type { MathTopic, PhysicsTopic, Subject, Topic } from './types'

/* Topic lists live apart from the templates so validation can use them without loading the generator. */

export const MATH_TOPICS: { id: MathTopic; label: string }[] = [
  { id: 'arithmetic', label: 'Mental arithmetic' },
  { id: 'fractions', label: 'Fractions, percentages & ratios' },
  { id: 'sdt', label: 'Speed, distance & time' },
  { id: 'fuel', label: 'Fuel calculations' },
  { id: 'units', label: 'Unit conversions' },
  { id: 'time', label: 'Time & time zones' },
  { id: 'algebra', label: 'Algebra' },
  { id: 'averages', label: 'Averages' },
  { id: 'data', label: 'Graphs, charts & tables' },
  { id: 'geometry', label: 'Geometry & trigonometry' },
]

export const PHYSICS_TOPICS: { id: PhysicsTopic; label: string }[] = [
  { id: 'newton', label: "Newton's laws" },
  { id: 'forces', label: 'Force, mass & weight' },
  { id: 'motion', label: 'Speed, velocity & acceleration' },
  { id: 'energy', label: 'Work, energy & power' },
  { id: 'momentum', label: 'Momentum & collisions' },
  { id: 'pressure', label: 'Pressure, density & fluids' },
  { id: 'aero', label: 'Basic aerodynamics' },
  { id: 'electricity', label: 'Electricity' },
  { id: 'heat', label: 'Heat & thermodynamics' },
  { id: 'waves', label: 'Waves, sound & light' },
  { id: 'machines', label: 'Levers, pulleys & torque' },
  { id: 'particles', label: 'Particles & physical reasoning' },
]

const TOPIC_LABEL = new Map<Topic, string>([...MATH_TOPICS, ...PHYSICS_TOPICS].map((t) => [t.id, t.label]))
const TOPIC_SUBJECT = new Map<Topic, Subject>([
  ...MATH_TOPICS.map((t) => [t.id, 'math'] as const),
  ...PHYSICS_TOPICS.map((t) => [t.id, 'physics'] as const),
])

export const topicLabel = (t: Topic) => TOPIC_LABEL.get(t) ?? t
export const subjectOfTopic = (t: Topic): Subject => TOPIC_SUBJECT.get(t) ?? 'math'
export const isTopic = (v: unknown): v is Topic => typeof v === 'string' && TOPIC_LABEL.has(v as Topic)
export const topicsOf = (s: Subject): Topic[] => (s === 'math' ? MATH_TOPICS : PHYSICS_TOPICS).map((t) => t.id)
