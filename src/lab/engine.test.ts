import { describe, expect, it } from 'vitest'
import { validateQuestion } from './build'
import { MATH_TOPICS, PHYSICS_TOPICS, TEMPLATES, buildTest, generateQuestion, templatesFor, weakAreaWeights } from './engine'
import type { Difficulty, LabResult, Question, QuestionKey, TestConfig } from './types'

const LEVELS: Difficulty[] = [1, 2, 3]
const SEEDS_PER_LEVEL = 300

const correct = (q: Question) => q.choices[q.answer]
/** Pull numbers out of text like "2,400 kg" or "−3.5". */
const nums = (s: string) => [...s.matchAll(/−?\d[\d,]*(?:\.\d+)?/g)].map((m) => Number(m[0].replace(/,/g, '').replace('−', '-')))
const numOf = (s: string) => nums(s)[0]
const hmToMin = (s: string) => {
  const h = s.match(/(\d+) h/)
  const m = s.match(/(\d+) min/)
  return (h ? Number(h[1]) * 60 : 0) + (m ? Number(m[1]) : 0)
}
const clockToMin = (s: string) => {
  const [h, m] = s.split(':').map(Number)
  return h * 60 + m
}

function* every(templateId: string, level: Difficulty, n = SEEDS_PER_LEVEL) {
  for (let seed = 1; seed <= n; seed++) yield generateQuestion({ templateId, difficulty: level, seed: seed * 7919, slot: seed % 4 })
}

describe('question generator', () => {
  it('has templates for every topic at every difficulty', () => {
    for (const t of [...MATH_TOPICS, ...PHYSICS_TOPICS]) {
      for (const d of LEVELS) expect(templatesFor(t.id, d).length, `${t.id} level ${d}`).toBeGreaterThan(0)
    }
  })

  it(`generates valid questions for every template (${SEEDS_PER_LEVEL} seeds × 3 levels each)`, () => {
    let total = 0
    for (const t of TEMPLATES) {
      for (const d of t.levels) {
        const texts = new Set<string>()
        for (const q of every(t.id, d)) {
          total++
          expect(validateQuestion(q), `${q.id}: ${q.text}`).toEqual([])
          expect(new Set(q.choices).size).toBe(4)
          expect(q.answer).toBeGreaterThanOrEqual(0)
          expect(q.answer).toBeLessThanOrEqual(3)
          texts.add(q.text + q.choices.join() + JSON.stringify(q.diagram ?? null))
        }
        // Variety: the same template should rarely repeat itself exactly.
        expect(texts.size / SEEDS_PER_LEVEL, `${t.id} level ${d} variety`).toBeGreaterThan(0.01)
      }
    }
    expect(total).toBeGreaterThan(20000)
  })

  it('is deterministic for a given key', () => {
    const key: QuestionKey = { templateId: 'fuel-endurance', difficulty: 2, seed: 12345, slot: 1 }
    expect(generateQuestion(key)).toEqual(generateQuestion(key))
  })

  it('numeric choices are distinct by a clear margin and shown in ascending order', () => {
    for (const t of TEMPLATES) {
      for (const d of t.levels) {
        for (const q of every(t.id, d, 60)) {
          if (q.diagram?.kind === 'graph' && /Segment/.test(q.choices[0])) continue
          const values = q.choices.map((c) =>
            /^\d\d:\d\d$/.test(c) ? clockToMin(c) : /^\d+ (h|min)\b/.test(c) ? hmToMin(c) : /^−?\d/.test(c) ? numOf(c) : NaN,
          )
          if (values.some((v) => v === undefined || Number.isNaN(v))) continue
          for (let i = 1; i < 4; i++) expect(values[i], `${q.id}: ${q.choices.join(' | ')}`).toBeGreaterThan(values[i - 1])
        }
      }
    }
  })
})

/* ---- independent re-computation of answers from the question text ---- */

describe('answers are mathematically correct', () => {
  it('arithmetic expressions evaluate to the marked answer', () => {
    for (const id of ['ar-order', 'ar-mult', 'ar-div']) {
      for (const d of LEVELS) {
        for (const q of every(id, d, 200)) {
          const expr = q.text.replace(/^Calculate /, '').replace(/\.$/, '').replace(/,/g, '').replace(/×/g, '*').replace(/÷/g, '/').replace(/−/g, '-').replace(/(\d+)²/g, '($1**2)')
          const value = Function(`return (${expr})`)() as number
          expect(numOf(correct(q)), `${q.text} → ${correct(q)}`).toBeCloseTo(value, 6)
        }
      }
    }
  })

  it('linear equations: the answer satisfies the equation', () => {
    for (const d of LEVELS) {
      for (const q of every('alg-linear', d, 200)) {
        const x = numOf(correct(q))
        const eq = q.text.split(':  ')[1].replace(/−/g, '-').replace(/÷/g, '/').replace(/(\d)x/g, '$1*x').replace(/(\d)\(/g, '$1*(')
        const [l, r] = eq.split('=').map((side) => Function('x', `return (${side})`)(x) as number)
        expect(l, q.text).toBeCloseTo(r, 9)
      }
    }
  })

  it('fuel endurance with reserve: (fuel − reserve) ÷ burn', () => {
    for (const q of every('fuel-endurance', 2, 300)) {
      const [B, F, R] = nums(q.text)
      expect(hmToMin(correct(q))).toBe(Math.round(((F - R) / B) * 60))
    }
  })

  it('flight time: distance ÷ speed', () => {
    for (const q of every('sdt-time', 1, 300)) {
      const [dist, s] = nums(q.text)
      expect(hmToMin(correct(q))).toBe(Math.round((dist / s) * 60))
    }
  })

  it('arrival time: departure + duration', () => {
    for (const q of every('time-arrival', 1, 300)) {
      const dep = clockToMin(q.text.match(/(\d\d:\d\d)/)![1])
      const dur = hmToMin(q.text.match(/takes (.+?)\. /)![1])
      expect(clockToMin(correct(q))).toBe((dep + dur) % 1440)
    }
  })

  it('Celsius → Fahrenheit', () => {
    for (const q of every('unit-temp', 1, 200)) {
      const c = numOf(q.text)
      expect(numOf(correct(q))).toBeCloseTo(c * 1.8 + 32, 6)
    }
  })

  it('Pythagoras', () => {
    for (const q of every('geo-pyth', 1, 200)) {
      const [a, b] = nums(q.text)
      expect(numOf(correct(q))).toBeCloseTo(Math.hypot(a, b), 6)
    }
  })

  it('percent of', () => {
    for (const q of every('fr-percent', 1, 200)) {
      const [p, y] = nums(q.text)
      expect(numOf(correct(q))).toBeCloseTo((p * y) / 100, 6)
    }
  })

  it("Newton's second law from a change of velocity", () => {
    for (const q of every('fo-fma', 2, 300)) {
      const [m, u, v, t] = nums(q.text)
      expect(numOf(correct(q))).toBeCloseTo((m * (v - u)) / t, 6)
    }
  })

  it('acceleration = (v − u) / t', () => {
    for (const q of every('mo-accel', 1, 200)) {
      const [u, v, t] = nums(q.text)
      expect(numOf(correct(q))).toBeCloseTo((v - u) / t, 6)
    }
  })

  it('wave speed = f λ', () => {
    for (const q of every('wv-speed', 1, 200)) {
      const [f, lam] = nums(q.text)
      expect(numOf(correct(q))).toBeCloseTo(f * lam, 6)
    }
  })

  it('kinetic energy = ½ m v²', () => {
    for (const q of every('en-ke', 1, 200)) {
      const [m, v] = nums(q.text)
      expect(numOf(correct(q))).toBeCloseTo(0.5 * m * v * v, 6)
    }
  })

  it('series voltage divider', () => {
    for (const q of every('el-ohm', 3, 200)) {
      const [V, R1, R2] = nums(q.text)
      expect(numOf(correct(q))).toBeCloseTo((V * R2) / (R1 + R2), 6)
    }
  })

  it('moments balance on a lever', () => {
    for (const q of every('mc-moments', 2, 200)) {
      const [L, d1, W1] = nums(q.text)
      expect(numOf(correct(q))).toBeCloseTo((W1 * d1) / (L - d1), 6)
    }
  })

  it('diagram data matches the question (bar chart difference)', () => {
    for (const q of every('data-bars', 1, 200)) {
      if (q.diagram?.kind !== 'bars') throw new Error('missing chart')
      const { labels, values } = q.diagram
      const [hi, lo] = [...q.text.matchAll(/on (\w{3})/g)].map((m) => labels.indexOf(m[1]))
      expect(numOf(correct(q))).toBe(values[hi] - values[lo])
    }
  })
})

/* ---- test assembly ---- */

const base: TestConfig = { subject: 'math', count: 50, difficulty: 'intermediate', topics: [], timeMode: 'timed', minutes: 45, calculator: false }

describe('test assembly', () => {
  it('builds a 50-question maths and physics test', () => {
    for (const subject of ['math', 'physics', 'combined'] as const) {
      const keys = buildTest({ ...base, subject }, 42)
      expect(keys).toHaveLength(50)
      const qs = keys.map(generateQuestion)
      expect(new Set(qs.map((q) => q.text)).size).toBe(50)
      if (subject !== 'combined') expect(qs.every((q) => q.subject === subject)).toBe(true)
    }
  })

  it('repeating a test gives genuinely different questions', () => {
    const a = new Set(buildTest(base, 1).map((k) => generateQuestion(k).text))
    const b = buildTest(base, 2).map((k) => generateQuestion(k).text)
    const shared = b.filter((t) => a.has(t))
    // Only conceptual items from a fixed bank may recur; generated ones should not.
    expect(shared.length, shared.join('\n')).toBeLessThan(8)
  })

  it('spreads correct answers across A–D', () => {
    const counts = [0, 0, 0, 0]
    for (let s = 1; s <= 20; s++) {
      for (const subject of ['math', 'physics'] as const) {
        for (const k of buildTest({ ...base, subject, difficulty: 'adaptive' }, s * 31)) counts[generateQuestion(k).answer]++
      }
    }
    const total = counts.reduce((a, b) => a + b, 0)
    for (const c of counts) expect(c / total).toBeGreaterThan(0.18)
    for (const c of counts) expect(c / total).toBeLessThan(0.32)
  })

  it('difficulty changes question complexity (expected solving time)', () => {
    const avg = (d: TestConfig['difficulty']) => {
      const qs = [1, 2, 3].flatMap((s) => buildTest({ ...base, subject: 'combined', difficulty: d }, s).map(generateQuestion))
      return qs.reduce((a, q) => a + q.expectedSeconds, 0) / qs.length
    }
    const [b, i, a] = [avg('basic'), avg('intermediate'), avg('advanced')]
    expect(i).toBeGreaterThan(b * 1.2)
    expect(a).toBeGreaterThan(i * 1.2)
  })

  it('respects a custom topic selection', () => {
    const keys = buildTest({ ...base, topics: ['fuel', 'time'] }, 7)
    expect(keys.map(generateQuestion).every((q) => q.topic === 'fuel' || q.topic === 'time')).toBe(true)
  })

  it('weak-area practice concentrates on low-accuracy topics', () => {
    const items = buildTest({ ...base, count: 20 }, 9).map((key) => {
      const q = generateQuestion(key)
      return { key, subject: q.subject, topic: q.topic, difficulty: q.difficulty, choice: q.topic === 'fuel' ? (q.answer + 1) % 4 : q.answer, answer: q.answer, timeMs: 30000, expected: q.expectedSeconds, flagged: false, checked: false }
    })
    if (!items.some((i) => i.topic === 'fuel')) return
    const result: LabResult = { id: 'r', generatorVersion: 1, date: '2026-10-14', startedAt: '', finishedAt: '', config: { ...base, count: 20 }, durationSec: 600, endReason: 'submitted', items }
    const weights = weakAreaWeights(result)
    const keys = buildTest({ ...base, count: 30, weights }, 11)
    const fuel = keys.map(generateQuestion).filter((q) => q.topic === 'fuel').length
    expect(fuel).toBeGreaterThanOrEqual(8)
  })
})
