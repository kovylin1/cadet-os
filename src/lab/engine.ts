import { finalize, type Template } from './build'
import { MATH_TEMPLATES } from './math'
import { PHYSICS_TEMPLATES } from './physics'
import { createRng, mixSeed } from './rng'
import { topicsOf } from './topics'
import type {
  Difficulty,
  LabResult,
  Question,
  QuestionKey,
  Subject,
  TestConfig,
  Topic,
} from './types'

/** Bump when templates change in a way that would rebuild old keys into different questions. */
export const GENERATOR_VERSION = 1

export { MATH_TOPICS, PHYSICS_TOPICS, isTopic, subjectOfTopic, topicLabel, topicsOf } from './topics'

export const TEMPLATES: Template[] = [...MATH_TEMPLATES, ...PHYSICS_TEMPLATES]
const BY_ID = new Map(TEMPLATES.map((t) => [t.id, t]))

export function templatesFor(topic: Topic, difficulty: Difficulty): Template[] {
  return TEMPLATES.filter((t) => t.topic === topic && t.levels.includes(difficulty))
}

/** Rebuild a question from its key. Deterministic: the same key always gives the same question. */
export function generateQuestion(key: QuestionKey): Question {
  const t = BY_ID.get(key.templateId)
  if (!t) throw new Error(`Unknown question template "${key.templateId}"`)
  const r = createRng(key.seed)
  for (let attempt = 0; attempt < 60; attempt++) {
    const draft = t.make(r, key.difficulty)
    if (!draft) continue
    const q = finalize(t, key, draft, r)
    if (q) return q
  }
  throw new Error(`Template ${t.id} could not produce a valid question for seed ${key.seed}`)
}

export function tryGenerate(key: QuestionKey): Question | null {
  try {
    return generateQuestion(key)
  } catch {
    return null
  }
}

/* ---------------- test assembly ---------------- */

export function defaultMinutes(count: number, mode: TestConfig['timeMode']): number {
  if (mode === 'speed') return Math.max(5, Math.round(count * 0.6))
  return Math.max(5, Math.round(count * 0.9))
}

export function poolTopics(config: Pick<TestConfig, 'subject' | 'topics'>): Topic[] {
  const subjects: Subject[] = config.subject === 'combined' ? ['math', 'physics'] : [config.subject]
  const all = subjects.flatMap(topicsOf)
  const chosen = config.topics.filter((t) => all.includes(t))
  return chosen.length ? chosen : all
}

interface TopicStat {
  seen: number
  correct: number
  /** Mean of time ÷ expected time, over answered items. */
  pace: number
}

export function topicStats(history: LabResult[], limit = 400): Map<Topic, TopicStat> {
  const items = history.flatMap((r) => r.items).slice(-limit)
  const acc = new Map<Topic, { seen: number; correct: number; paceSum: number; paceN: number }>()
  for (const it of items) {
    const s = acc.get(it.topic) ?? { seen: 0, correct: 0, paceSum: 0, paceN: 0 }
    s.seen++
    if (it.choice === it.answer) s.correct++
    if (it.choice != null && it.expected > 0) {
      s.paceSum += it.timeMs / 1000 / it.expected
      s.paceN++
    }
    acc.set(it.topic, s)
  }
  return new Map([...acc].map(([k, s]) => [k, { seen: s.seen, correct: s.correct, pace: s.paceN ? s.paceSum / s.paceN : 1 }]))
}

/**
 * Adaptive Mixed: topics you get wrong (or haven't practised) come up more often,
 * and difficulty follows recent accuracy and speed per topic.
 */
function adaptiveWeights(topics: Topic[], stats: Map<Topic, TopicStat>): Map<Topic, number> {
  return new Map(
    topics.map((t) => {
      const s = stats.get(t)
      if (!s || s.seen < 3) return [t, 1.4]
      const acc = s.correct / s.seen
      const exposure = 1 / Math.sqrt(1 + s.seen / 30)
      return [t, (0.5 + (1 - acc) * 2) * (0.6 + exposure)]
    }),
  )
}

function adaptiveDifficulty(stat: TopicStat | undefined, roll: number): Difficulty {
  if (!stat || stat.seen < 3) return roll < 0.3 ? 1 : roll < 0.75 ? 2 : 3
  const acc = stat.correct / stat.seen
  const quick = stat.pace <= 1.1
  if (acc >= 0.85 && quick) return roll < 0.25 ? 2 : 3
  if (acc >= 0.65) return roll < 0.2 ? 1 : roll < 0.65 ? 2 : 3
  if (acc >= 0.45) return roll < 0.45 ? 1 : roll < 0.9 ? 2 : 3
  return roll < 0.7 ? 1 : 2
}

/** Split `count` questions across topics in proportion to their weights (largest remainder). */
function allocate(topics: Topic[], weights: Map<Topic, number>, count: number): Map<Topic, number> {
  const total = topics.reduce((a, t) => a + (weights.get(t) ?? 1), 0)
  const raw = topics.map((t) => ({ t, x: ((weights.get(t) ?? 1) / total) * count }))
  const out = new Map(raw.map(({ t, x }) => [t, Math.floor(x)]))
  let left = count - [...out.values()].reduce((a, b) => a + b, 0)
  for (const { t } of [...raw].sort((a, b) => (b.x % 1) - (a.x % 1))) {
    if (left <= 0) break
    out.set(t, (out.get(t) ?? 0) + 1)
    left--
  }
  return out
}

export function buildTest(config: TestConfig, seed: number, history: LabResult[] = []): QuestionKey[] {
  const r = createRng(seed)
  const topics = poolTopics(config)
  const stats = topicStats(history)
  const weights = config.weights
    ? new Map(topics.map((t) => [t, config.weights?.[t] ?? 0.3]))
    : config.difficulty === 'adaptive'
      ? adaptiveWeights(topics, stats)
      : new Map(topics.map((t) => [t, 1]))

  const counts = allocate(topics, weights, config.count)
  const sequence = r.shuffle(topics.flatMap((t) => Array<Topic>(counts.get(t) ?? 0).fill(t)))
  // Balanced answer positions: each of A–D appears count/4 times (± 1).
  const slots = r.shuffle(Array.from({ length: config.count }, (_, i) => i % 4))
  const fixed: Record<string, Difficulty> = { basic: 1, intermediate: 2, advanced: 3 }
  const lastTemplate = new Map<Topic, string[]>()
  const seenText = new Set<string>()

  return sequence.map((topic, i) => {
    const difficulty = fixed[config.difficulty] ?? adaptiveDifficulty(stats.get(topic), r.next())
    const options = templatesFor(topic, difficulty)
    // Rotate through a topic's templates so two neighbours rarely share a template.
    const used = lastTemplate.get(topic) ?? []
    const fresh = options.filter((t) => !used.includes(t.id))
    const t = r.pick(fresh.length ? fresh : options)
    lastTemplate.set(topic, fresh.length ? [...used, t.id] : [t.id])

    // Avoid repeating a question within the test: try other seeds, then the topic's other
    // templates at this level, then neighbouring levels.
    const candidates: [Template, Difficulty][] = [
      [t, difficulty],
      ...options.filter((o) => o !== t).map((o) => [o, difficulty] as [Template, Difficulty]),
      ...([1, 2, 3] as Difficulty[])
        .filter((d) => d !== difficulty)
        .flatMap((d) => templatesFor(topic, d).map((o) => [o, d] as [Template, Difficulty])),
    ]
    for (const [tt, dd] of candidates) {
      for (let salt = 0; salt < 12; salt++) {
        const key: QuestionKey = { templateId: tt.id, difficulty: dd, seed: mixSeed(seed, i * 131 + salt * 7919 + tt.id.length), slot: slots[i] }
        const q = tryGenerate(key)
        if (q && !seenText.has(q.text)) {
          seenText.add(q.text)
          return key
        }
      }
    }
    return { templateId: t.id, difficulty, seed: mixSeed(seed, i * 131 + 99991), slot: slots[i] }
  })
}

/** Weights for "practise my weak areas": low-accuracy topics dominate, strong ones still appear. */
export function weakAreaWeights(result: LabResult): Partial<Record<Topic, number>> {
  const by = new Map<Topic, { n: number; ok: number }>()
  for (const it of result.items) {
    const s = by.get(it.topic) ?? { n: 0, ok: 0 }
    s.n++
    if (it.choice === it.answer) s.ok++
    by.set(it.topic, s)
  }
  const out: Partial<Record<Topic, number>> = {}
  for (const [t, s] of by) out[t] = 0.25 + (1 - s.ok / s.n) * 3
  return out
}
