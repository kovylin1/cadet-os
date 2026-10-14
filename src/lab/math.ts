import { by, clock, hm, num, round, stepFor, type Draft, type NumericDraft, type Template } from './build'
import type { Rng } from './rng'
import type { Difficulty, MathTopic } from './types'

/*
 * Mathematics templates. Each one draws its own parameters, computes the answer
 * from those parameters (never from the choices) and lists the values a typical
 * mistake produces as distractors. Numbers are chosen so the answer is exact or
 * the question says how to round.
 */

const tpl = (
  id: string,
  topic: MathTopic,
  make: (r: Rng, d: Difficulty) => Draft | null,
  levels: Difficulty[] = [1, 2, 3],
): Template => ({ id, subject: 'math', topic, levels, make })

const ints = (xs: number[]) => xs.filter((x) => Number.isInteger(x))
const mod = (v: number, m: number) => ((v % m) + m) % m
const day = (v: number) => mod(Math.round(v), 1440)
const hdg = (v: number) => mod(Math.round(v), 360)
const pad3 = (v: number) => `${String(hdg(v)).padStart(3, '0')}°`
const signed = (v: number) => (v < 0 ? `− ${num(-v)}` : `+ ${num(v)}`)
/** A duration written as decimal hours read like h.mm — the classic 1.5 h = "1 h 50 min" slip. */
const decimalSlip = (minutes: number) => {
  const h = minutes / 60
  const whole = Math.floor(h)
  const frac = Math.round((h - whole) * 100)
  return frac >= 60 ? null : whole * 60 + frac
}
const clean = (xs: (number | null | undefined)[]) => xs.filter((x): x is number => x != null && Number.isFinite(x))

const numeric = (o: Omit<NumericDraft, 'kind' | 'format' | 'step'> & Partial<Pick<NumericDraft, 'format' | 'step'>>): NumericDraft => ({
  kind: 'numeric',
  format: (v) => num(v),
  step: stepFor(o.value),
  ...o,
  traps: clean(o.traps),
})

const timeDraft = (o: Omit<NumericDraft, 'kind' | 'format' | 'step' | 'min'> & { step?: number }): NumericDraft => ({
  kind: 'numeric',
  format: hm,
  step: o.step ?? (o.value > 120 ? 10 : 5),
  min: 5,
  ...o,
  traps: clean(o.traps).map(Math.round),
})

const clockDraft = (o: Omit<NumericDraft, 'kind' | 'format' | 'step' | 'min' | 'max'> & { step?: number }): NumericDraft => ({
  kind: 'numeric',
  format: clock,
  step: o.step ?? 30,
  min: 0,
  max: 1439,
  ...o,
  value: day(o.value),
  traps: clean(o.traps).map(day),
})

const ZONES: [string, number][] = [
  ['Astana', 5],
  ['London', 0],
  ['Dubai', 4],
  ['Istanbul', 3],
  ['Frankfurt', 1],
  ['Bangkok', 7],
  ['Beijing', 8],
  ['Seoul', 9],
  ['New York', -5],
  ['Reykjavík', 0],
]
const utc = (o: number) => (o === 0 ? 'UTC' : `UTC${o > 0 ? '+' : '−'}${Math.abs(o)}`)

function twoZones(r: Rng, minGap = 1): [[string, number], [string, number]] {
  for (;;) {
    const a = r.pick(ZONES)
    const b = r.pick(ZONES)
    if (a[0] !== b[0] && Math.abs(a[1] - b[1]) >= minGap) return [a, b]
  }
}

/* ======================= 1. Mental arithmetic ======================= */

const arOrder = tpl('ar-order', 'arithmetic', (r, d) => {
  if (d === 1) {
    const a = r.int(12, 60)
    const b = r.int(3, 9)
    const c = r.int(3, 9)
    const v = a + b * c
    return numeric({
      text: `Calculate ${a} + ${b} × ${c}.`,
      value: v,
      traps: [(a + b) * c, a * b + c, a + b + c],
      formula: 'Order of operations: brackets, powers, × and ÷, then + and −',
      explanation: [`Multiply first: ${b} × ${c} = ${b * c}.`, `Then add: ${a} + ${b * c} = ${v}.`],
      expectedSeconds: 20,
    })
  }
  if (d === 2) {
    const a = r.int(4, 12)
    const b = r.int(6, 15)
    const dv = r.int(3, 9)
    const q = r.int(3, 12)
    const c = dv * q
    const v = a * b - q
    if (v <= 0) return null
    return numeric({
      text: `Calculate ${a} × ${b} − ${c} ÷ ${dv}.`,
      value: v,
      traps: ints([(a * b - c) / dv, a * b - c, a * (b - q)]),
      formula: 'Order of operations: × and ÷ before + and −',
      explanation: [`${a} × ${b} = ${a * b}.`, `${c} ÷ ${dv} = ${q}.`, `${a * b} − ${q} = ${v}.`],
      expectedSeconds: 30,
    })
  }
  const e = r.int(3, 9)
  const q = r.int(8, 24)
  const a = r.int(3, 9)
  const b = r.int(3, 12)
  const c = q * e - a * b
  const f = r.int(2, 5)
  if (c < 2) return null
  const v = q - f * f
  return numeric({
    text: `Calculate (${a} × ${b} + ${c}) ÷ ${e} − ${f}².`,
    value: v,
    min: -1000,
    traps: ints([q - 2 * f, q + f * f, a * b + c / e - f * f, (q - f) ** 2]),
    formula: 'Order of operations: brackets, powers, × and ÷, then + and −',
    explanation: [
      `Inside the brackets: ${a} × ${b} = ${a * b}, plus ${c} = ${q * e}.`,
      `${q * e} ÷ ${e} = ${q}.`,
      `${f}² = ${f * f}.`,
      `${q} − ${f * f} = ${num(v)}.`,
    ],
    expectedSeconds: 45,
  })
})

const arMult = tpl('ar-mult', 'arithmetic', (r, d) => {
  if (d === 3) {
    const x = r.int(11, 49) / 10
    const y = r.int(11, 29) / 10
    if (Number.isInteger(x) || Number.isInteger(y)) return null
    const v = round(x * y, 2)
    return numeric({
      text: `Calculate ${num(x)} × ${num(y)}.`,
      value: v,
      traps: [round(v * 10, 2), round(v / 10, 3), round(Math.floor(x) * Math.floor(y) + (x % 1) * (y % 1), 2)],
      step: stepFor(v, 0.1),
      explanation: [
        `Ignore the decimal points: ${Math.round(x * 10)} × ${Math.round(y * 10)} = ${Math.round(x * 10) * Math.round(y * 10)}.`,
        `There are two decimal places in total, so the answer is ${num(v)}.`,
      ],
      expectedSeconds: 40,
    })
  }
  const a = d === 1 ? r.int(12, 99) : r.int(13, 49)
  const b = d === 1 ? r.int(3, 9) : r.int(13, 39)
  if (a % 10 === 0 || b % 10 === 0) return null
  const v = a * b
  const bt = Math.floor(b / 10) * 10
  return numeric({
    text: `Calculate ${a} × ${b}.`,
    value: v,
    traps: [v + 10, v - 10, d === 2 ? a * bt + (a % 10) * (b % 10) : v + 100],
    step: 10,
    explanation:
      d === 1
        ? [`${a} × ${b} = ${Math.floor(a / 10) * 10} × ${b} + ${a % 10} × ${b} = ${Math.floor(a / 10) * 10 * b} + ${(a % 10) * b} = ${v}.`]
        : [`Split ${b} into ${bt} + ${b % 10}.`, `${a} × ${bt} = ${a * bt}; ${a} × ${b % 10} = ${a * (b % 10)}.`, `${a * bt} + ${a * (b % 10)} = ${v}.`],
    expectedSeconds: d === 1 ? 20 : 40,
  })
})

const arDiv = tpl('ar-div', 'arithmetic', (r, d) => {
  if (d === 1) {
    const dv = r.int(6, 12)
    const q = r.int(4, 15)
    const n = dv * q
    return numeric({
      text: `Calculate ${n} ÷ ${dv}.`,
      value: q,
      traps: [q * 10, n - dv],
      explanation: [`${dv} × ${q} = ${n}, so ${n} ÷ ${dv} = ${q}.`],
      expectedSeconds: 15,
    })
  }
  const dv = d === 2 ? r.pick([0.2, 0.4, 0.5, 0.25, 0.8]) : r.pick([0.03, 0.04, 0.06, 0.012, 0.025])
  const q = d === 2 ? r.int(6, 40) : r.int(3, 40) * 5
  const n = round(q * dv, 4)
  return numeric({
    text: `Calculate ${num(n, 4)} ÷ ${num(dv, 4)}.`,
    value: q,
    traps: [q / 10, q * 10, d === 3 ? q / 100 : round(n * dv, 4)],
    format: (v) => num(v, 4),
    explanation: [
      `Multiply both numbers by the same power of ten so the divisor is a whole number.`,
      `${num(n, 4)} ÷ ${num(dv, 4)} = ${num(n * 1000, 4)} ÷ ${num(dv * 1000, 4)} = ${q}.`,
    ],
    expectedSeconds: d === 2 ? 30 : 45,
  })
})

/* ======================= 2. Fractions, percentages, ratios ======================= */

const frPercent = tpl('fr-percent', 'fractions', (r, d) => {
  if (d === 1) {
    const p = r.pick([5, 10, 15, 20, 25, 30, 40, 60, 75])
    const y = r.int(2, 40) * 20
    const v = (p * y) / 100
    return numeric({
      text: `What is ${p}% of ${num(y)}?`,
      value: v,
      traps: ints([(p * y) / 10, y - v, (p * y) / 1000]),
      formula: 'x% of y = x ÷ 100 × y',
      explanation: [`${p}% = ${p} ÷ 100 = ${num(p / 100)}.`, `${num(p / 100)} × ${num(y)} = ${num(v)}.`],
      expectedSeconds: 20,
    })
  }
  if (d === 2) {
    const a = r.pick([40, 60, 80, 120, 160, 200, 240, 300, 400, 500])
    const p = r.pick([5, 10, 15, 20, 25, 30, 40, 60, 75])
    const up = r.chance(0.5) || p > 50
    const b = up ? a + (a * p) / 100 : a - (a * p) / 100
    return numeric({
      text: `A fuel price changes from ${num(a)} to ${num(b)} per tonne. What is the percentage ${up ? 'increase' : 'decrease'}?`,
      value: p,
      format: (v) => `${num(v, 1)}%`,
      traps: [round((Math.abs(b - a) / b) * 100, 1), Math.abs(b - a)],
      step: 5,
      formula: 'Percentage change = change ÷ original × 100',
      explanation: [
        `Change = ${num(Math.abs(b - a))}.`,
        `Divide by the original value: ${num(Math.abs(b - a))} ÷ ${num(a)} = ${num(p / 100)}.`,
        `× 100 = ${p}%.`,
      ],
      expectedSeconds: 40,
    })
  }
  const orig = r.int(4, 40) * 20
  const p = r.pick([10, 20, 25, 40, 50])
  const up = r.chance(0.5)
  const after = up ? orig * (1 + p / 100) : orig * (1 - p / 100)
  return numeric({
    text: up
      ? `After a ${p}% increase, an airport fee is ${num(after)}. What was the fee before the increase?`
      : `After a ${p}% discount, a ticket costs ${num(after)}. What was the price before the discount?`,
    value: orig,
    traps: [round(up ? after * (1 - p / 100) : after * (1 + p / 100), 2), up ? after - p : after + p],
    step: stepFor(orig, 5),
    formula: up ? 'Original = new ÷ (1 + rate)' : 'Original = new ÷ (1 − rate)',
    explanation: [
      `The new value is ${up ? 100 + p : 100 - p}% of the original.`,
      `Original = ${num(after)} ÷ ${num(up ? 1 + p / 100 : 1 - p / 100)} = ${num(orig)}.`,
      `Taking ${p}% of the new value instead is a common mistake: the percentage applies to the original.`,
    ],
    expectedSeconds: 50,
  })
})

const frRatio = tpl('fr-ratio', 'fractions', (r, d) => {
  if (d === 1) {
    const a = r.int(1, 7)
    const b = r.int(1, 7)
    if (a === b) return null
    const k = r.int(5, 40) * 10
    const N = (a + b) * k
    const big = Math.max(a, b) * k
    return numeric({
      text: `${num(N)} kg of cargo is loaded into the forward and aft holds in the ratio ${a} : ${b}. How much goes into the ${a > b ? 'forward' : 'aft'} hold?`,
      value: big,
      format: (v) => `${num(v)} kg`,
      traps: ints([Math.min(a, b) * k, N / 2, (N * Math.max(a, b)) / 10]),
      formula: 'Share = total ÷ (sum of parts) × part',
      explanation: [`Total parts = ${a} + ${b} = ${a + b}.`, `One part = ${num(N)} ÷ ${a + b} = ${num(k)} kg.`, `${Math.max(a, b)} parts = ${num(big)} kg.`],
      expectedSeconds: 35,
    })
  }
  if (d === 2) {
    const [a, b, c] = [r.int(1, 6), r.int(2, 7), r.int(1, 6)]
    if (new Set([a, b, c]).size < 3) return null
    const k = r.int(3, 30) * 5
    const N = (a + b + c) * k
    return numeric({
      text: `A bonus of ${num(N)} is shared between three crews in the ratio ${a} : ${b} : ${c}. How much does the second crew receive?`,
      value: b * k,
      traps: [a * k, c * k, ...ints([N / 3])],
      formula: 'Share = total ÷ (sum of parts) × part',
      explanation: [`Total parts = ${a + b + c}.`, `One part = ${num(N)} ÷ ${a + b + c} = ${num(k)}.`, `Second crew: ${b} × ${num(k)} = ${num(b * k)}.`],
      expectedSeconds: 45,
    })
  }
  const b = r.int(1, 5)
  const a = b + r.int(1, 4)
  if (gcd(a, b) !== 1) return null
  const k = r.int(3, 30)
  const X = (a - b) * k
  const total = (a + b) * k
  return numeric({
    text: `The ratio of economy to business passengers on a flight is ${a} : ${b}. There are ${X} more economy than business passengers. How many passengers are there in total?`,
    value: total,
    traps: [X * (a + b), a * k, total - X],
    formula: 'One part = difference ÷ (difference in parts)',
    explanation: [
      `The difference is ${a} − ${b} = ${a - b} parts, which equals ${X} passengers.`,
      `One part = ${X} ÷ ${a - b} = ${k}.`,
      `Total = (${a} + ${b}) × ${k} = ${total}.`,
    ],
    expectedSeconds: 60,
  })
})

const frFraction = tpl('fr-fraction', 'fractions', (r, d) => {
  if (d === 1) {
    const den = r.pick([3, 4, 5, 6, 8, 10])
    const nu = r.int(1, den - 1)
    if (gcd(nu, den) !== 1) return null
    const n = den * r.int(4, 60)
    const v = (n / den) * nu
    return numeric({
      text: `What is ${nu}/${den} of ${num(n)}?`,
      value: v,
      traps: ints([n / den, (n * den) / nu, n - v]),
      explanation: [`${num(n)} ÷ ${den} = ${num(n / den)}.`, `× ${nu} = ${num(v)}.`],
      expectedSeconds: 20,
    })
  }
  if (d === 2) {
    const den = r.pick([4, 5, 8, 16, 20, 25])
    const nu = r.int(1, den - 1)
    if (gcd(nu, den) !== 1) return null
    const v = nu / den
    return numeric({
      text: `Write ${nu}/${den} as a decimal.`,
      value: v,
      format: (x) => num(x, 4),
      traps: [v / 10, v * 10, round(nu / (den + 10), 4)],
      step: stepFor(v, 0.01),
      explanation: [`${nu} ÷ ${den} = ${num(v, 4)}.`, den === 8 || den === 16 ? `Useful fact: 1/8 = 0.125.` : `Scale the fraction to a denominator of 100 or 1,000 if that helps.`],
      expectedSeconds: 30,
    })
  }
  const n = r.pick([4, 5, 6, 8, 10])
  const a = r.int(1, n - 2)
  const b = r.int(a + 1, n)
  const k = r.int(2, 20) * 25
  const X = (b - a) * k
  const cap = n * k
  return numeric({
    text: `A fuel tank is ${a}/${n} full. After ${num(X)} litres are added it is ${b === n ? 'completely full' : `${b}/${n} full`}. What is the capacity of the tank?`,
    value: cap,
    format: (v) => `${num(v)} L`,
    traps: ints([(X * n) / a, (X * n) / b, X * (b - a), X + (a * X) / (b - a) / 2]),
    explanation: [
      `The added fuel fills ${b}/${n} − ${a}/${n} = ${b - a}/${n} of the tank.`,
      `${b - a}/${n} of the capacity = ${num(X)} L, so 1/${n} = ${num(k)} L.`,
      `Capacity = ${n} × ${num(k)} = ${num(cap)} L.`,
    ],
    expectedSeconds: 60,
  })
})

function gcd(a: number, b: number): number {
  return b === 0 ? a : gcd(b, a % b)
}

/* ======================= 3. Speed, distance, time ======================= */

const sdtTime = tpl('sdt-time', 'sdt', (r, d) => {
  if (d === 1) {
    const s = r.step(120, 480, 30)
    const t = r.step(40, 240, 10)
    if (t % 60 === 0) return null
    const dist = (s * t) / 60
    return timeDraft({
      text: `An aircraft flies ${num(dist)} NM at a groundspeed of ${s} kt. How long does the flight take?`,
      value: t,
      traps: [decimalSlip(t), t + 60],
      formula: 'time = distance ÷ speed',
      explanation: [`${num(dist)} ÷ ${s} = ${num(t / 60, 3)} h.`, `${num(t / 60, 3)} h × 60 = ${t} min = ${hm(t)}.`],
      expectedSeconds: 40,
    })
  }
  if (d === 2) {
    const gs = r.step(150, 450, 30)
    const w = r.step(10, 50, 5)
    const head = r.chance(0.6)
    const tas = head ? gs + w : gs - w
    const t = r.step(40, 240, 10)
    if (t % 60 === 0) return null
    const dist = (gs * t) / 60
    return timeDraft({
      text: `An aircraft has a true airspeed of ${tas} kt with a ${w} kt ${head ? 'headwind' : 'tailwind'}. How long will it take to fly ${num(dist)} NM?`,
      value: t,
      traps: [(dist / tas) * 60, (dist / (head ? tas + w : tas - w)) * 60, decimalSlip(t)],
      formula: 'groundspeed = TAS ∓ wind;  time = distance ÷ groundspeed',
      explanation: [
        `Groundspeed = ${tas} ${head ? '−' : '+'} ${w} = ${gs} kt.`,
        `Time = ${num(dist)} ÷ ${gs} = ${num(t / 60, 3)} h = ${hm(t)}.`,
      ],
      expectedSeconds: 60,
    })
  }
  for (let i = 0; i < 80; i++) {
    const s1 = r.step(120, 360, 30)
    const s2 = r.step(120, 360, 30)
    const t1 = r.step(20, 120, 20)
    const t2 = r.step(20, 120, 20)
    const d1 = (s1 * t1) / 60
    const d2 = (s2 * t2) / 60
    const avg = ((d1 + d2) * 60) / (t1 + t2)
    if (s1 === s2 || !Number.isInteger(avg) || avg === (s1 + s2) / 2) continue
    return numeric({
      text: `An aircraft flies ${num(d1)} NM at ${s1} kt, then ${num(d2)} NM at ${s2} kt. What is its average groundspeed for the whole journey?`,
      value: avg,
      format: (v) => `${num(v, 1)} kt`,
      traps: [(s1 + s2) / 2, round((d1 + d2) / ((t1 + t2) / 100), 1)],
      step: 5,
      formula: 'average speed = total distance ÷ total time',
      explanation: [
        `Leg 1: ${num(d1)} ÷ ${s1} = ${hm(t1)}. Leg 2: ${num(d2)} ÷ ${s2} = ${hm(t2)}.`,
        `Total distance ${num(d1 + d2)} NM in ${hm(t1 + t2)} (${num((t1 + t2) / 60, 3)} h).`,
        `Average = ${num(d1 + d2)} ÷ ${num((t1 + t2) / 60, 3)} = ${avg} kt. Averaging the two speeds is wrong because the legs take different times.`,
      ],
      expectedSeconds: 90,
    })
  }
  return null
})

const sdtSpeed = tpl('sdt-speed', 'sdt', (r, d) => {
  if (d === 1) {
    const s = r.step(120, 480, 30)
    const t = r.step(10, 90, 10)
    const v = (s * t) / 60
    return numeric({
      text: `An aircraft flies at a groundspeed of ${s} kt for ${t} minutes. How far does it travel?`,
      value: v,
      format: (x) => `${num(x, 1)} NM`,
      traps: [round((s * t) / 100, 1), v * 2],
      formula: 'distance = speed × time (time in hours)',
      explanation: [`${t} min = ${num(t / 60, 3)} h.`, `${s} × ${num(t / 60, 3)} = ${num(v)} NM.`],
      expectedSeconds: 30,
    })
  }
  if (d === 2) {
    const s = r.step(120, 480, 30)
    const t = r.step(40, 200, 10)
    const dist = (s * t) / 60
    const slip = Math.floor(t / 60) + (t % 60) / 100
    return numeric({
      text: `A flight of ${num(dist)} NM must be completed in ${hm(t)}. What groundspeed is required?`,
      value: s,
      format: (x) => `${num(x)} kt`,
      traps: [Math.round(dist / slip), Math.round(dist / Math.floor(t / 60 || 1))],
      step: 10,
      formula: 'speed = distance ÷ time',
      explanation: [`${hm(t)} = ${num(t / 60, 3)} h.`, `${num(dist)} ÷ ${num(t / 60, 3)} = ${s} kt.`],
      expectedSeconds: 45,
    })
  }
  const vA = r.step(120, 300, 30)
  const vB = vA + r.step(30, 120, 30)
  const m = r.step(10, 60, 10)
  const t = (vA * m) / (vB - vA)
  if (!Number.isInteger(t)) return null
  return timeDraft({
    text: `Aircraft A departs at ${vA} kt. Aircraft B departs from the same airport ${m} minutes later on the same route at ${vB} kt. How long after B departs does it catch up with A?`,
    value: t,
    traps: [t + m, (vA * m) / vB, (vB * m) / (vB - vA) + m],
    formula: 'catch-up time = head start distance ÷ closing speed',
    explanation: [
      `In ${m} min, A covers ${vA} × ${num(m / 60, 3)} = ${num((vA * m) / 60)} NM.`,
      `B closes the gap at ${vB} − ${vA} = ${vB - vA} kt.`,
      `${num((vA * m) / 60)} ÷ ${vB - vA} = ${num(t / 60, 3)} h = ${hm(t)}.`,
    ],
    expectedSeconds: 90,
  })
})

/* ======================= 4. Fuel ======================= */

const fuelEndurance = tpl('fuel-endurance', 'fuel', (r, d) => {
  if (d === 1) {
    const B = r.step(600, 3000, 200)
    const T = r.step(60, 300, 15)
    const F = (B * T) / 60
    return timeDraft({
      text: `An aircraft has ${num(F)} kg of usable fuel and burns ${num(B)} kg per hour. How long can it fly?`,
      value: T,
      traps: [decimalSlip(T), T + 30],
      formula: 'endurance = fuel ÷ burn rate',
      explanation: [`${num(F)} ÷ ${num(B)} = ${num(T / 60, 3)} h = ${hm(T)}.`],
      expectedSeconds: 35,
    })
  }
  if (d === 2) {
    const B = r.step(800, 3200, 200)
    const T = r.step(60, 240, 15)
    const R = B * r.pick([0.5, 0.75, 1])
    const F = (B * T) / 60 + R
    return timeDraft({
      text: `An aircraft burns ${num(B)} kg of fuel per hour. It has ${num(F)} kg remaining and must land with at least ${num(R)} kg in reserve. What is its maximum remaining flight time?`,
      value: T,
      traps: [(F / B) * 60, ((F + R) / B) * 60, decimalSlip(T)],
      formula: 'time = (fuel − reserve) ÷ burn rate',
      explanation: [
        `Usable fuel = ${num(F)} − ${num(R)} = ${num(F - R)} kg.`,
        `${num(F - R)} ÷ ${num(B)} = ${num(T / 60, 3)} h = ${hm(T)}.`,
      ],
      expectedSeconds: 55,
    })
  }
  const B = r.step(1200, 4000, 400)
  const T = r.step(60, 300, 15)
  const res = r.pick([30, 45])
  const kg = (B * (T + res)) / 60
  const L = kg / 0.8
  return timeDraft({
    text: `An aircraft has ${num(L)} litres of fuel on board (density 0.8 kg/L) and burns ${num(B)} kg/h. It must keep a final reserve of ${res} minutes at the same burn rate. How long can it fly before reaching the reserve?`,
    value: T,
    traps: [((L - (B * res) / 60) / B) * 60, (kg / B) * 60, ((L / 0.8 - (B * res) / 60) / B) * 60],
    formula: 'mass = volume × density;  time = (fuel − reserve) ÷ burn rate',
    explanation: [
      `Fuel mass = ${num(L)} × 0.8 = ${num(kg)} kg.`,
      `Reserve = ${num(B)} × ${num(res / 60, 3)} = ${num((B * res) / 60)} kg.`,
      `Usable = ${num(kg - (B * res) / 60)} kg; ÷ ${num(B)} = ${num(T / 60, 3)} h = ${hm(T)}.`,
    ],
    expectedSeconds: 90,
  })
})

const fuelRequired = tpl('fuel-required', 'fuel', (r, d) => {
  if (d === 1) {
    const B = r.step(600, 3600, 120)
    const t = r.step(20, 240, 5)
    const v = (B * t) / 60
    return numeric({
      text: `An aircraft burns ${num(B)} kg of fuel per hour. How much fuel does a ${hm(t)} flight use?`,
      value: v,
      format: (x) => `${num(x)} kg`,
      traps: [Math.round(B * (Math.floor(t / 60) + (t % 60) / 100)), (B * t) / 100],
      formula: 'fuel = burn rate × time',
      explanation: [`${hm(t)} = ${num(t / 60, 3)} h.`, `${num(B)} × ${num(t / 60, 3)} = ${num(v)} kg.`],
      expectedSeconds: 35,
    })
  }
  const gs = r.step(180, 480, 30)
  const T = r.step(40, 300, 10)
  const D = (gs * T) / 60
  const B = r.step(900, 3600, 60)
  const trip = (B * T) / 60
  if (d === 2) {
    return numeric({
      text: `A route of ${num(D)} NM is flown at a groundspeed of ${gs} kt, burning ${num(B)} kg/h. How much trip fuel is needed?`,
      value: trip,
      format: (x) => `${num(x)} kg`,
      traps: [Math.round(B * (Math.floor(T / 60) + (T % 60) / 100)), Math.round((B * D) / gs / 0.6)],
      formula: 'time = distance ÷ groundspeed;  fuel = burn rate × time',
      explanation: [`Time = ${num(D)} ÷ ${gs} = ${num(T / 60, 3)} h.`, `Fuel = ${num(B)} × ${num(T / 60, 3)} = ${num(trip)} kg.`],
      expectedSeconds: 55,
    })
  }
  const w = r.step(20, 60, 10)
  const tas = gs + w
  const taxi = r.step(100, 300, 50)
  const reserve = B / 2
  const total = taxi + trip + reserve
  return numeric({
    text: `Plan the block fuel: route ${num(D)} NM, true airspeed ${tas} kt with a ${w} kt headwind, burn ${num(B)} kg/h, taxi fuel ${taxi} kg, final reserve 30 minutes at the same burn rate.`,
    value: total,
    format: (x) => `${num(x)} kg`,
    traps: [taxi + Math.round((B * D) / tas) + reserve, trip + reserve, taxi + trip],
    formula: 'block fuel = taxi + trip + reserve',
    explanation: [
      `Groundspeed = ${tas} − ${w} = ${gs} kt; time = ${num(D)} ÷ ${gs} = ${num(T / 60, 3)} h.`,
      `Trip fuel = ${num(B)} × ${num(T / 60, 3)} = ${num(trip)} kg. Reserve = ${num(B)} × 0.5 = ${num(reserve)} kg.`,
      `Total = ${taxi} + ${num(trip)} + ${num(reserve)} = ${num(total)} kg.`,
    ],
    expectedSeconds: 100,
  })
})

const fuelRemaining = tpl('fuel-remaining', 'fuel', (r, d) => {
  if (d === 3) {
    for (let i = 0; i < 60; i++) {
      const C = r.step(4000, 20000, 1000)
      const p = r.step(60, 100, 5)
      const q = r.step(20, p - 10, 5)
      const t = r.pick([30, 45, 60, 90, 120])
      const burned = (C * (p - q)) / 100
      const B = (burned * 60) / t
      if (!Number.isInteger(B) || B < 400 || B > 5000) continue
      const current = (C * p) / 100
      return numeric({
        text: `A fuel tank with a capacity of ${num(C)} kg is ${p}% full. The engine burns ${num(B)} kg/h. What percentage of the tank's capacity remains after ${hm(t)}?`,
        value: q,
        format: (x) => `${num(x, 1)}%`,
        traps: [round(((current - burned) / current) * 100, 1), round((burned / C) * 100, 1)],
        step: 5,
        explanation: [
          `Fuel now = ${p}% × ${num(C)} = ${num(current)} kg.`,
          `Fuel burned = ${num(B)} × ${num(t / 60, 3)} = ${num(burned)} kg; remaining ${num(current - burned)} kg.`,
          `${num(current - burned)} ÷ ${num(C)} = ${q}% of capacity.`,
        ],
        expectedSeconds: 90,
      })
    }
    return null
  }
  const engines = d === 2 ? 2 : 1
  const E = r.step(300, 2400, 60)
  const B = E * engines
  const t = r.step(15, 180, 5)
  const burned = (B * t) / 60
  const F = burned + r.step(500, 5000, 100)
  const v = F - burned
  return numeric({
    text:
      engines === 1
        ? `An aircraft takes off with ${num(F)} kg of fuel and burns ${num(B)} kg/h. How much fuel remains after ${hm(t)}?`
        : `A twin-engine aircraft takes off with ${num(F)} kg of fuel. Each engine burns ${num(E)} kg/h. How much fuel remains after ${hm(t)}?`,
    value: v,
    format: (x) => `${num(x)} kg`,
    traps: [F - (E * t) / 60, burned, F - Math.round(B * (Math.floor(t / 60) + (t % 60) / 100))],
    formula: 'remaining = initial − burn rate × time',
    explanation: [
      engines === 2 ? `Total burn = 2 × ${num(E)} = ${num(B)} kg/h.` : `Burn rate ${num(B)} kg/h.`,
      `Burned = ${num(B)} × ${num(t / 60, 3)} = ${num(burned)} kg.`,
      `Remaining = ${num(F)} − ${num(burned)} = ${num(v)} kg.`,
    ],
    expectedSeconds: d === 1 ? 35 : 50,
  })
})

/* ======================= 5. Unit conversions ======================= */

interface Conv {
  text: (x: string) => string
  given: string
  input: number
  value: number
  dp: number
  unitOut: string
  traps: number[]
  steps: string[]
}

const unitConv = tpl('unit-conv', 'units', (r, d) => {
  const pick = (r: Rng): Conv => {
    const options: (() => Conv)[] = by<(() => Conv)[]>(
      d,
      [
        () => {
          const kg = r.step(50, 5000, 50)
          return { text: (x) => `Convert ${x} kg to pounds.`, given: '1 kg = 2.2 lb', input: kg, value: kg * 2.2, dp: 1, unitOut: 'lb', traps: [round(kg / 2.2, 1), kg * 2, kg * 2.5], steps: [`${num(kg)} × 2.2 = ${num(kg * 2.2, 1)} lb.`] }
        },
        () => {
          const kg = r.step(50, 3000, 50)
          const lb = kg * 2.2
          return { text: (x) => `Convert ${x} lb to kilograms.`, given: '1 kg = 2.2 lb', input: lb, value: kg, dp: 1, unitOut: 'kg', traps: [round(lb * 2.2, 1), lb / 2, round(lb - 2.2 * 10, 1)], steps: [`Pounds → kilograms: divide by 2.2.`, `${num(lb, 1)} ÷ 2.2 = ${num(kg)} kg.`] }
        },
        () => {
          const m = r.step(100, 3000, 100)
          return { text: (x) => `Convert ${x} m to feet.`, given: '1 m = 3.28 ft', input: m, value: m * 3.28, dp: 0, unitOut: 'ft', traps: [Math.round(m / 3.28), m * 3, m * 3.5], steps: [`${num(m)} × 3.28 = ${num(m * 3.28)} ft.`] }
        },
      ],
      [
        () => {
          const nm = r.step(50, 1000, 50)
          return { text: (x) => `Convert ${x} NM to kilometres.`, given: '1 NM = 1.852 km', input: nm, value: nm * 1.852, dp: 1, unitOut: 'km', traps: [round(nm / 1.852, 1), round(nm * 1.609, 1), round(nm * 1.5, 1)], steps: [`${num(nm)} × 1.852 = ${num(nm * 1.852, 1)} km. (1.609 is the factor for statute miles, not nautical miles.)`] }
        },
        () => {
          const kmh = r.step(36, 900, 36)
          return { text: (x) => `Convert ${x} km/h to metres per second.`, given: '1 km = 1,000 m;  1 h = 3,600 s', input: kmh, value: kmh / 3.6, dp: 1, unitOut: 'm/s', traps: [round(kmh * 3.6, 1), round(kmh / 60, 1), kmh / 6], steps: [`${num(kmh)} km/h = ${num(kmh * 1000)} m per 3,600 s.`, `${num(kmh * 1000)} ÷ 3,600 = ${num(kmh / 3.6)} m/s (equivalently, divide by 3.6).`] }
        },
        () => {
          const kt = r.step(50, 500, 50)
          return { text: (x) => `Convert ${x} kt to km/h.`, given: '1 kt = 1.852 km/h', input: kt, value: kt * 1.852, dp: 1, unitOut: 'km/h', traps: [round(kt / 1.852, 1), round(kt * 1.609, 1), kt * 2], steps: [`${num(kt)} × 1.852 = ${num(kt * 1.852, 1)} km/h.`] }
        },
        () => {
          const ft = r.step(500, 10000, 500)
          return { text: (x) => `Convert ${x} ft to metres, to the nearest metre.`, given: '1 ft = 0.3048 m', input: ft, value: Math.round(ft * 0.3048), dp: 0, unitOut: 'm', traps: [Math.round(ft / 0.3048), Math.round(ft * 0.3), Math.round(ft / 3)], steps: [`${num(ft)} × 0.3048 = ${num(ft * 0.3048, 1)} m ≈ ${num(Math.round(ft * 0.3048))} m.`] }
        },
      ],
      [
        () => {
          const L = r.step(500, 10000, 500)
          return { text: (x) => `An aircraft is refuelled with ${x} litres of jet fuel (density 0.8 kg/L). What is the mass of the fuel in pounds?`, given: '1 kg = 2.2 lb', input: L, value: L * 0.8 * 2.2, dp: 0, unitOut: 'lb', traps: [L * 2.2, L * 0.8, Math.round((L / 0.8) * 2.2)], steps: [`Mass = ${num(L)} × 0.8 = ${num(L * 0.8)} kg.`, `${num(L * 0.8)} × 2.2 = ${num(L * 1.76)} lb.`] }
        },
        () => {
          const L = r.step(500, 8000, 500)
          const lb = L * 1.76
          return { text: (x) => `The fuel gauge shows ${x} lb of jet fuel (density 0.8 kg/L). How many litres is that?`, given: '1 kg = 2.2 lb', input: lb, value: L, dp: 0, unitOut: 'L', traps: [lb / 2.2, Math.round(lb / 0.8), Math.round((lb / 2.2) * 0.8)], steps: [`Mass = ${num(lb)} ÷ 2.2 = ${num(lb / 2.2)} kg.`, `Volume = ${num(lb / 2.2)} ÷ 0.8 = ${num(L)} L.`] }
        },
        () => {
          const g = r.step(100, 4000, 100)
          const L = round(g * 3.785, 1)
          return { text: (x) => `Convert ${x} litres to US gallons.`, given: '1 US gallon = 3.785 L', input: L, value: g, dp: 0, unitOut: 'US gal', traps: [Math.round(L * 3.785), Math.round(L / 4.546), Math.round(L / 3)], steps: [`${num(L, 1)} ÷ 3.785 = ${num(g)} US gal. (4.546 L is the imperial gallon.)`] }
        },
      ],
    )
    return r.pick(options)()
  }
  const c = pick(r)
  const v = round(c.value, c.dp)
  return numeric({
    text: c.text(num(c.input, 1)),
    given: c.given,
    value: v,
    format: (x) => `${num(x, c.dp)} ${c.unitOut}`,
    traps: c.traps.map((t) => round(t, c.dp)),
    step: stepFor(v, c.dp === 0 ? 1 : 0.1),
    explanation: c.steps,
    expectedSeconds: by(d, 30, 45, 75),
  })
})

const unitTemp = tpl('unit-temp', 'units', (r, d) => {
  const C = r.step(-30, 40, 5)
  const F = C * 1.8 + 32
  if (d === 1)
    return numeric({
      text: `Convert ${num(C)} °C to degrees Fahrenheit.`,
      value: F,
      min: -100,
      format: (x) => `${num(x, 1)} °F`,
      traps: [round((C + 32) * 1.8, 1), C * 1.8, round((C - 32) / 1.8, 1)],
      step: 5,
      formula: '°F = °C × 9/5 + 32',
      explanation: [`${num(C)} × 1.8 = ${num(C * 1.8)}.`, `${num(C * 1.8)} + 32 = ${num(F)} °F.`],
      expectedSeconds: 35,
    })
  if (d === 2)
    return numeric({
      text: `Convert ${num(F)} °F to degrees Celsius.`,
      value: C,
      min: -100,
      format: (x) => `${num(x, 1)} °C`,
      traps: [round(F / 1.8 - 32, 1), round((F - 32) * 1.8, 1), round((F + 32) / 1.8, 1)],
      step: 5,
      formula: '°C = (°F − 32) × 5/9',
      explanation: [`${num(F)} − 32 = ${num(F - 32)}.`, `${num(F - 32)} ÷ 1.8 = ${num(C)} °C.`],
      expectedSeconds: 45,
    })
  const dc = r.step(5, 40, 5)
  return numeric({
    text: `During a climb the outside air temperature falls by ${dc} °C. By how many degrees Fahrenheit has it fallen?`,
    value: dc * 1.8,
    format: (x) => `${num(x, 1)} °F`,
    traps: [dc * 1.8 + 32, dc + 32, dc / 1.8],
    step: 5,
    formula: 'A temperature difference converts with × 9/5 only (no +32)',
    explanation: [
      `The +32 shifts the zero point; it cancels out when you take a difference.`,
      `${dc} × 1.8 = ${num(dc * 1.8)} °F.`,
    ],
    expectedSeconds: 50,
  })
})

/* ======================= 6. Time ======================= */

const timeArrival = tpl('time-arrival', 'time', (r, d) => {
  if (d === 1) {
    const dep = r.step(5 * 60, 17 * 60, 5)
    const dur = r.step(35, 300, 5)
    if (dur % 60 === 0) return null
    const arr = dep + dur
    return clockDraft({
      text: `A flight departs at ${clock(dep)} and takes ${hm(dur)}. At what time does it arrive (same time zone)?`,
      value: arr,
      traps: [arr - 60, arr + 40, dep + Math.floor(dur / 60) * 60],
      step: 15,
      explanation: [`${clock(dep)} + ${Math.floor(dur / 60)} h = ${clock(dep + Math.floor(dur / 60) * 60)}.`, `+ ${dur % 60} min = ${clock(arr)}.`],
      expectedSeconds: 25,
    })
  }
  if (d === 2) {
    const dep = r.step(20 * 60, 23 * 60 + 30, 5)
    const delay = r.step(15, 90, 5)
    const dur = r.step(95, 360, 5)
    const arr = dep + delay + dur
    return clockDraft({
      text: `A flight is scheduled to depart at ${clock(dep)} but is delayed by ${delay} minutes. The flight time is ${hm(dur)}. At what time does it arrive (same time zone)?`,
      value: arr,
      traps: [dep + dur, arr - 60, arr + 40],
      step: 15,
      explanation: [`Actual departure = ${clock(dep)} + ${delay} min = ${clock(dep + delay)}.`, `${clock(dep + delay)} + ${hm(dur)} = ${clock(arr)} (the next day).`],
      expectedSeconds: 40,
    })
  }
  const [[cA, oA], [cB, oB]] = twoZones(r, 2)
  const dep = r.step(0, 23 * 60, 5)
  const dur = r.step(120, 600, 5)
  const arr = dep - oA * 60 + dur + oB * 60
  return clockDraft({
    text: `A flight leaves ${cA} (${utc(oA)}) at ${clock(dep)} local time. The flight takes ${hm(dur)}. What is the local time on arrival in ${cB} (${utc(oB)})?`,
    value: arr,
    traps: [dep + dur, dep + oA * 60 + dur - oB * 60, dep - oA * 60 + dur],
    step: 60,
    explanation: [
      `Departure in UTC: ${clock(dep)} ${oA >= 0 ? '−' : '+'} ${Math.abs(oA)} h = ${clock(dep - oA * 60)} UTC.`,
      `Arrival in UTC: + ${hm(dur)} = ${clock(dep - oA * 60 + dur)} UTC.`,
      `Local time in ${cB}: ${oB >= 0 ? '+' : '−'} ${Math.abs(oB)} h = ${clock(arr)}.`,
    ],
    expectedSeconds: 75,
  })
})

const timeDuration = tpl('time-duration', 'time', (r, d) => {
  if (d === 1) {
    const a = r.step(5 * 60, 14 * 60, 5)
    const dur = r.step(40, 420, 5)
    if (dur % 60 === 0 || (a % 60) <= ((a + dur) % 60)) return null
    const b = a + dur
    return timeDraft({
      text: `A training session starts at ${clock(a)} and ends at ${clock(b)}. How long does it last?`,
      value: dur,
      traps: [dur + 40, dur - 60, dur + 60],
      explanation: [`From ${clock(a)} to ${clock(a + (60 - (a % 60)))} is ${60 - (a % 60)} min.`, `Then to ${clock(b)}: total ${hm(dur)}.`],
      expectedSeconds: 30,
    })
  }
  if (d === 2) {
    const a = r.step(19 * 60, 23 * 60 + 55, 5)
    const dur = r.step(Math.max(150, 1440 - a + 20), 600, 5)
    const b = a + dur
    return timeDraft({
      text: `A flight departs at ${clock(a)} and lands at ${clock(b)} the next day (same time zone). What is the flight time?`,
      value: dur,
      traps: [Math.abs(a - day(b)), dur + 40, 1440 - dur],
      explanation: [`From ${clock(a)} to midnight = ${hm(1440 - a)}.`, `Midnight to ${clock(b)} = ${hm(day(b))}.`, `Total = ${hm(dur)}.`],
      expectedSeconds: 45,
    })
  }
  const [[cA, oA], [cB, oB]] = twoZones(r, 2)
  const dep = r.step(6 * 60, 20 * 60, 5)
  const dur = r.step(150, 540, 5)
  const arrLocal = day(dep - oA * 60 + dur + oB * 60)
  const naive = mod(arrLocal - dep, 1440)
  return timeDraft({
    text: `A flight departs ${cA} (${utc(oA)}) at ${clock(dep)} local time and arrives in ${cB} (${utc(oB)}) at ${clock(arrLocal)} local time. How long was the flight?`,
    value: dur,
    traps: [naive, mod(naive + 2 * (oA - oB) * 60, 1440), dur + 60],
    step: 30,
    explanation: [
      `Departure = ${clock(dep - oA * 60)} UTC; arrival = ${clock(arrLocal - oB * 60)} UTC.`,
      `Difference = ${hm(dur)}. Subtracting the two local times directly ignores the ${Math.abs(oA - oB)} h time difference.`,
    ],
    expectedSeconds: 80,
  })
})

const timeZone = tpl('time-utc', 'time', (r, d) => {
  if (d === 1) {
    const city = r.pick(ZONES.filter((z) => z[1] > 0))
    const off = city[1]
    const local = r.step(off * 60, 23 * 60 + 30, 5)
    return clockDraft({
      text: `The local time in ${city[0]} (${utc(off)}) is ${clock(local)}. What is the time in UTC?`,
      value: local - off * 60,
      traps: [local + off * 60, local - off * 60 + 60, local - (off - 1) * 60],
      step: 60,
      explanation: [`${utc(off)} means local time is ${off} h ahead of UTC, so subtract ${off} h.`, `${clock(local)} − ${off} h = ${clock(local - off * 60)} UTC.`],
      expectedSeconds: 25,
    })
  }
  const [[cA, oA], [cB, oB]] = d === 2 ? twoZones(r, 2) : twoZonesOppositeSigns(r)
  const t = r.step(0, 23 * 60 + 30, 15)
  const v = t + (oB - oA) * 60
  return clockDraft({
    text: `When it is ${clock(t)} in ${cA} (${utc(oA)}), what time is it in ${cB} (${utc(oB)})?`,
    value: v,
    traps: [t - (oB - oA) * 60, t + (Math.abs(oB) - Math.abs(oA)) * 60, t + (oA + oB) * 60],
    step: 60,
    explanation: [
      `${cB} is ${num(Math.abs(oB - oA))} h ${oB > oA ? 'ahead of' : 'behind'} ${cA} (${utc(oB)} vs ${utc(oA)}).`,
      `${clock(t)} ${oB > oA ? '+' : '−'} ${num(Math.abs(oB - oA))} h = ${clock(v)}.`,
    ],
    expectedSeconds: d === 2 ? 35 : 50,
  })
})

function twoZonesOppositeSigns(r: Rng): [[string, number], [string, number]] {
  const west = ZONES.filter((z) => z[1] < 0)
  const east = ZONES.filter((z) => z[1] > 0)
  const a = r.pick(west)
  const b = r.pick(east)
  return r.chance(0.5) ? [a, b] : [b, a]
}

/* ======================= 7. Algebra ======================= */

const algLinear = tpl('alg-linear', 'algebra', (r, d) => {
  if (d === 1) {
    const x = r.int(2, 15)
    const a = r.int(2, 9)
    const b = r.int(1, 30)
    const c = a * x + b
    return numeric({
      text: `Solve for x:  ${a}x + ${b} = ${c}`,
      value: x,
      min: -100,
      traps: ints([(c + b) / a, c / a - b, c - b - a]),
      step: 1,
      explanation: [`Subtract ${b}: ${a}x = ${c - b}.`, `Divide by ${a}: x = ${x}.`],
      expectedSeconds: 25,
    })
  }
  if (d === 2) {
    const x = r.int(-6, 15)
    const a = r.int(3, 8)
    const c = r.int(1, a - 1)
    const b = r.int(1, 9)
    const e = a * (x - b) - c * x
    if (x === 0 || e === 0) return null
    return numeric({
      text: `Solve for x:  ${a}(x − ${b}) = ${c === 1 ? '' : c}x ${signed(e)}`,
      value: x,
      min: -100,
      traps: ints([(e + b) / (a - c), (e - a * b) / (a - c), (e + a * b) / (a + c), -x]),
      step: 1,
      explanation: [
        `Expand: ${a}x − ${a * b} = ${c === 1 ? '' : c}x ${signed(e)}.`,
        `Collect x terms: ${a - c === 1 ? '' : a - c}x = ${num(e + a * b)}.`,
        `x = ${num(e + a * b)} ÷ ${a - c} = ${num(x)}.`,
      ],
      expectedSeconds: 50,
    })
  }
  const x = r.int(-5, 14)
  const c = r.int(2, 5)
  const a = r.int(1, 7)
  const e = r.int(1, 8)
  if (a === c || x === 0) return null
  const b = c * (x - e) - a * x
  if (b === 0) return null
  return numeric({
    text: `Solve for x:  (${a === 1 ? '' : a}x ${signed(b)}) ÷ ${c} = x − ${e}`,
    value: x,
    min: -100,
    traps: ints([(b + e) / (c - a), (b - c * e) / (c - a), (c * e - b) / (c - a), -x]),
    step: 1,
    explanation: [
      `Multiply both sides by ${c}: ${a === 1 ? '' : a}x ${signed(b)} = ${c}x − ${c * e}.`,
      `Rearrange: ${num(b + c * e)} = ${c - a}x.`,
      `x = ${num(b + c * e)} ÷ ${c - a} = ${num(x)}.`,
    ],
    expectedSeconds: 75,
  })
})

const REARRANGE: Record<Difficulty, { f: string; v: string; ok: string; wrong: string[] }[]> = {
  1: [
    { f: 's = d / t', v: 't', ok: 't = d / s', wrong: ['t = s / d', 't = d × s', 't = d − s'] },
    { f: 'F = m a', v: 'a', ok: 'a = F / m', wrong: ['a = m / F', 'a = F × m', 'a = F − m'] },
    { f: 'V = I R', v: 'I', ok: 'I = V / R', wrong: ['I = R / V', 'I = V × R', 'I = V − R'] },
    { f: 'P = W / t', v: 'W', ok: 'W = P t', wrong: ['W = P / t', 'W = t / P', 'W = P + t'] },
    { f: 'ρ = m / V', v: 'V', ok: 'V = m / ρ', wrong: ['V = ρ / m', 'V = m ρ', 'V = m − ρ'] },
    { f: 'p = F / A', v: 'A', ok: 'A = F / p', wrong: ['A = p / F', 'A = F p', 'A = F − p'] },
  ],
  2: [
    { f: 'v = u + a t', v: 't', ok: 't = (v − u) / a', wrong: ['t = v − u / a', 't = (v + u) / a', 't = a / (v − u)'] },
    { f: 'y = m x + c', v: 'x', ok: 'x = (y − c) / m', wrong: ['x = y / m − c', 'x = (y + c) / m', 'x = m / (y − c)'] },
    { f: 'E = m g h', v: 'h', ok: 'h = E / (m g)', wrong: ['h = E m / g', 'h = E g / m', 'h = m g / E'] },
    { f: 'C = (F − 32) × 5/9', v: 'F', ok: 'F = 9C / 5 + 32', wrong: ['F = 5C / 9 + 32', 'F = 9(C + 32) / 5', 'F = 9C / 5 − 32'] },
    { f: 'E = ½ m v²', v: 'v', ok: 'v = √(2E / m)', wrong: ['v = 2E / m', 'v = √(E / 2m)', 'v = √(2m / E)'] },
  ],
  3: [
    { f: 'v² = u² + 2 a s', v: 's', ok: 's = (v² − u²) / (2a)', wrong: ['s = (v − u)² / (2a)', 's = (v² + u²) / (2a)', 's = 2a / (v² − u²)'] },
    { f: 'T = 2π √(L / g)', v: 'L', ok: 'L = g T² / (4π²)', wrong: ['L = g T / (2π)', 'L = T² / (4π² g)', 'L = 4π² g / T²'] },
    { f: '1/R = 1/R₁ + 1/R₂', v: 'R', ok: 'R = R₁R₂ / (R₁ + R₂)', wrong: ['R = R₁ + R₂', 'R = (R₁ + R₂) / (R₁R₂)', 'R = R₁R₂(R₁ + R₂)'] },
    { f: 's = u t + ½ a t²', v: 'a', ok: 'a = 2(s − u t) / t²', wrong: ['a = (s − u t) / (2t²)', 'a = 2s / t² − u', 'a = 2(s − u) / t²'] },
    { f: 'p₁V₁ / T₁ = p₂V₂ / T₂', v: 'T₂', ok: 'T₂ = p₂V₂T₁ / (p₁V₁)', wrong: ['T₂ = p₁V₁T₁ / (p₂V₂)', 'T₂ = p₁V₁ / (p₂V₂T₁)', 'T₂ = p₂V₂ / (p₁V₁T₁)'] },
  ],
}

const algRearrange = tpl('alg-rearrange', 'algebra', (r, d) => {
  const item = r.pick(REARRANGE[d])
  return {
    kind: 'text',
    text: `Rearrange ${item.f} to make ${item.v} the subject.`,
    correct: item.ok,
    wrong: item.wrong,
    formula: item.f,
    explanation: [`Undo the operations around ${item.v} in reverse order, doing the same to both sides.`, `Result: ${item.ok}.`],
    expectedSeconds: by(d, 25, 45, 70),
  }
})

const algFormula = tpl('alg-formula', 'algebra', (r, d) => {
  if (d === 1) {
    const s = r.step(20, 120, 5)
    const t = r.int(2, 12)
    const dist = s * t
    return numeric({
      text: `Using s = d / t, find t when d = ${num(dist)} m and s = ${s} m/s.`,
      value: t,
      format: (x) => `${num(x, 2)} s`,
      traps: [round(s / dist, 2), dist * s / 100, t + 2],
      step: 1,
      formula: 't = d / s',
      explanation: [`t = d / s = ${num(dist)} ÷ ${s} = ${t} s.`],
      expectedSeconds: 25,
    })
  }
  if (d === 2) {
    const a = r.int(2, 9)
    const t = r.int(3, 12)
    const u = r.int(0, 20)
    const v = u + a * t
    return numeric({
      text: `Using v = u + a t, find a when v = ${v} m/s, u = ${u} m/s and t = ${t} s.`,
      value: a,
      format: (x) => `${num(x, 2)} m/s²`,
      traps: [round(v / t, 2), round((v + u) / t, 2), v - u - t],
      step: 1,
      formula: 'a = (v − u) / t',
      explanation: [`a = (${v} − ${u}) ÷ ${t} = ${v - u} ÷ ${t} = ${a} m/s².`],
      expectedSeconds: 40,
    })
  }
  const a = r.pick([1, 2, 4, 5, 8, 10])
  const u = r.int(0, 10) * 2
  const v = u + r.int(2, 12) * 2
  const s = (v * v - u * u) / (2 * a)
  if (!Number.isInteger(s)) return null
  return numeric({
    text: `Using v² = u² + 2 a s, find s when v = ${v} m/s, u = ${u} m/s and a = ${a} m/s².`,
    value: s,
    format: (x) => `${num(x, 1)} m`,
    traps: [((v - u) ** 2) / (2 * a), (v * v + u * u) / (2 * a), (v * v - u * u) / a],
    formula: 's = (v² − u²) / (2a)',
    explanation: [`v² − u² = ${v * v} − ${u * u} = ${v * v - u * u}.`, `÷ (2 × ${a}) = ${num(s)} m.`],
    expectedSeconds: 70,
  })
})

const algSimul = tpl('alg-simul', 'algebra', (r, d) => {
  if (d === 3) {
    const e = r.step(80, 300, 10)
    const b = e + r.step(50, 400, 10)
    const [a1, b1, a2, b2] = [r.int(1, 5), r.int(1, 4), r.int(1, 5), r.int(1, 4)]
    if (a1 * b2 - a2 * b1 === 0) return null
    const c1 = a1 * e + b1 * b
    const c2 = a2 * e + b2 * b
    const plural = (n: number, w: string) => `${n} ${w}${n === 1 ? '' : 's'}`
    return numeric({
      text: `${plural(a1, 'economy ticket')} and ${plural(b1, 'business ticket')} cost ${num(c1)} in total. ${plural(a2, 'economy ticket')} and ${plural(b2, 'business ticket')} cost ${num(c2)}. What is the price of one business ticket?`,
      value: b,
      traps: [e, b + e, b - e],
      step: 10,
      explanation: [
        `Let e = economy, b = business: ${a1}e + ${b1}b = ${num(c1)} and ${a2}e + ${b2}b = ${num(c2)}.`,
        `Eliminate e: multiply the first by ${a2} and the second by ${a1}, then subtract: ${a2 * b1 - a1 * b2}b = ${num(a2 * c1 - a1 * c2)}.`,
        `b = ${num(b)}, and then e = ${num(e)}.`,
      ],
      expectedSeconds: 100,
    })
  }
  const x = r.int(2, 15)
  const y = r.int(1, 12)
  if (d === 1) {
    if (x <= y) return null
    return numeric({
      text: `x + y = ${x + y} and x − y = ${x - y}. What is x?`,
      value: x,
      traps: [y, x + y, x - y],
      step: 1,
      explanation: [`Add the equations: 2x = ${2 * x}.`, `x = ${x} (and y = ${y}).`],
      expectedSeconds: 30,
    })
  }
  const [a1, b1, a2, b2] = [r.int(1, 5), r.int(1, 5), r.int(1, 5), r.int(-4, 4)]
  if (b2 === 0 || a1 * b2 - a2 * b1 === 0) return null
  const c1 = a1 * x + b1 * y
  const c2 = a2 * x + b2 * y
  const term = (k: number, v: string, first = false) => `${k < 0 ? (first ? '−' : '− ') : first ? '' : '+ '}${Math.abs(k) === 1 ? '' : Math.abs(k)}${v}`
  return numeric({
    text: `Solve the simultaneous equations ${term(a1, 'x', true)} ${term(b1, 'y')} = ${c1} and ${term(a2, 'x', true)} ${term(b2, 'y')} = ${num(c2)}. What is y?`,
    value: y,
    min: -50,
    traps: [x, x + y, -y],
    step: 1,
    explanation: [
      `Make the x coefficients equal (multiply by ${a2} and ${a1}) and subtract: ${a2 * b1 - a1 * b2}y = ${num(a2 * c1 - a1 * c2)}.`,
      `y = ${y}; substituting back gives x = ${x}.`,
    ],
    expectedSeconds: 70,
  })
})

/* ======================= 8. Averages ======================= */

const avgMean = tpl('avg-mean', 'averages', (r, d) => {
  if (d === 1) {
    const m = r.int(20, 90)
    const xs = [0, 1, 2, 3].map(() => m + r.int(-12, 12))
    const last = 5 * m - xs.reduce((a, b) => a + b, 0)
    if (last < 1) return null
    const all = r.shuffle([...xs, last])
    const sum = 5 * m
    return numeric({
      text: `Find the mean of ${all.join(', ')}.`,
      value: m,
      traps: ints([sum / 4, sum / 6, [...all].sort((a, b) => a - b)[2]]).filter((v) => v !== m),
      step: 1,
      formula: 'mean = sum ÷ count',
      explanation: [`Sum = ${sum}.`, `${sum} ÷ 5 = ${m}.`],
      expectedSeconds: 35,
    })
  }
  if (d === 2) {
    const M = r.int(65, 88)
    const five = [0, 1, 2, 3, 4].map(() => M + r.int(-10, 10))
    const need = 6 * M - five.reduce((a, b) => a + b, 0)
    if (need < 30 || need > 100) return null
    const mean5 = five.reduce((a, b) => a + b, 0) / 5
    return numeric({
      text: `A trainee's first five test scores are ${five.join(', ')}. What must the sixth score be for the mean of all six to be exactly ${M}?`,
      value: need,
      traps: ints([M, Math.round(2 * M - mean5), 5 * M - five.slice(0, 4).reduce((a, b) => a + b, 0)]).filter((v) => v >= 0),
      step: 2,
      formula: 'required total = target mean × count',
      explanation: [`Total needed = 6 × ${M} = ${6 * M}.`, `Sum of five = ${five.reduce((a, b) => a + b, 0)}.`, `Sixth = ${6 * M} − ${five.reduce((a, b) => a + b, 0)} = ${need}.`],
      expectedSeconds: 60,
    })
  }
  const n = r.int(6, 10)
  const A = r.int(68, 90)
  const B = A + r.int(-4, 4)
  const w = n * A - (n - 1) * B
  if (A === B || w < 50 || w > 120) return null
  return numeric({
    text: `The mean mass of ${n} crew members is ${A} kg. When one leaves, the mean mass of the remaining ${n - 1} is ${B} kg. What is the mass of the crew member who left?`,
    value: w,
    format: (x) => `${num(x)} kg`,
    traps: [A + (A - B), A, B],
    step: 2,
    explanation: [`Total before = ${n} × ${A} = ${n * A} kg.`, `Total after = ${n - 1} × ${B} = ${(n - 1) * B} kg.`, `Difference = ${w} kg.`],
    expectedSeconds: 70,
  })
})

const WEIGHTS = [
  [50, 30, 20],
  [40, 40, 20],
  [60, 25, 15],
  [50, 25, 25],
  [20, 30, 50],
]

const avgWeighted = tpl('avg-weighted', 'averages', (r, d) => {
  if (d === 1) {
    for (let i = 0; i < 40; i++) {
      const n1 = r.step(10, 60, 5)
      const n2 = r.step(10, 60, 5)
      const a1 = r.int(60, 95)
      const a2 = r.int(60, 95)
      const v = (n1 * a1 + n2 * a2) / (n1 + n2)
      if (n1 === n2 || a1 === a2 || !Number.isInteger(v)) continue
      return numeric({
        text: `${n1} passengers have a mean mass of ${a1} kg and ${n2} passengers have a mean mass of ${a2} kg. What is the mean mass of all ${n1 + n2} passengers?`,
        value: v,
        format: (x) => `${num(x, 1)} kg`,
        traps: [(a1 + a2) / 2],
        step: 1,
        formula: 'weighted mean = Σ(n × mean) ÷ Σn',
        explanation: [`Total = ${n1} × ${a1} + ${n2} × ${a2} = ${n1 * a1 + n2 * a2} kg.`, `÷ ${n1 + n2} = ${v} kg. The simple average of the two means ignores the group sizes.`],
        expectedSeconds: 50,
      })
    }
    return null
  }
  const w = r.pick(WEIGHTS)
  const names = ['Exam', 'Simulator check', 'Coursework']
  if (d === 2) {
    const s = [r.int(50, 98), r.int(50, 98), r.int(50, 98)]
    const v = round((w[0] * s[0] + w[1] * s[1] + w[2] * s[2]) / 100, 1)
    return numeric({
      text: `A course grade is weighted ${names.map((n, i) => `${n} ${w[i]}%`).join(', ')}. A trainee scores ${s.map((x, i) => `${x} (${names[i].toLowerCase()})`).join(', ')}. What is the overall grade?`,
      value: v,
      format: (x) => num(x, 1),
      traps: [round((s[0] + s[1] + s[2]) / 3, 1), round((w[2] * s[0] + w[1] * s[1] + w[0] * s[2]) / 100, 1)],
      step: 1,
      formula: 'weighted mean = Σ(weight × score) ÷ Σweights',
      explanation: [s.map((x, i) => `${w[i] / 100} × ${x}`).join(' + ') + ` = ${num(v, 1)}.`],
      expectedSeconds: 70,
    })
  }
  for (let i = 0; i < 40; i++) {
    const s1 = r.int(50, 98)
    const s2 = r.int(50, 98)
    const X = r.int(60, 90)
    const s3 = (X * 100 - w[1] * s1 - w[2] * s2) / w[0]
    if (!Number.isInteger(s3) || s3 < 20 || s3 > 100) continue
    return numeric({
      text: `A course grade is weighted ${names.map((n, j) => `${n} ${w[j]}%`).join(', ')}. A trainee has ${s1} in the simulator check and ${s2} in coursework. What exam score gives an overall grade of exactly ${X}?`,
      value: s3,
      traps: [X, 3 * X - s1 - s2, Math.round((X * 100 - w[0] * s1 - w[1] * s2) / w[2])].filter((v) => v >= 0),
      step: 2,
      explanation: [
        `Overall × 100 = ${X * 100} = ${w[0]} × exam + ${w[1]} × ${s1} + ${w[2]} × ${s2}.`,
        `${w[0]} × exam = ${X * 100 - w[1] * s1 - w[2] * s2}.`,
        `Exam = ${s3}.`,
      ],
      expectedSeconds: 90,
    })
  }
  return null
})

/* ======================= 9. Graphs, charts, tables ======================= */

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

const dataBars = tpl('data-bars', 'data', (r, d) => {
  const n = by(d, 5, 6, 6)
  const yStep = r.pick([10, 20, 50])
  const top = yStep * 10
  const start = r.int(0, (d === 1 ? 7 : 12) - n)
  const labels = (d === 1 ? DAYS : MONTHS).slice(start, start + n)
  const values = labels.map(() => yStep * r.int(2, 10))
  const what = d === 1 ? 'Departures per day' : 'Fuel uplift (tonnes) per month'
  const diagram = { kind: 'bars' as const, title: what, unit: d === 1 ? 'flights' : 't', labels, values, yMax: top, yStep }
  if (d === 1) {
    const i = r.int(0, n - 1)
    let j = r.int(0, n - 1)
    if (values[i] === values[j]) j = (j + 1) % n
    if (values[i] === values[j]) return null
    const [hi, lo] = values[i] > values[j] ? [i, j] : [j, i]
    const v = values[hi] - values[lo]
    return numeric({
      text: `The chart shows departures per day. How many more departures were there on ${labels[hi]} than on ${labels[lo]}?`,
      diagram,
      value: v,
      traps: [values[hi], values[lo], v + yStep],
      step: yStep,
      explanation: [`${labels[hi]}: ${values[hi]}; ${labels[lo]}: ${values[lo]}.`, `${values[hi]} − ${values[lo]} = ${v}.`],
      expectedSeconds: 30,
    })
  }
  const total = values.reduce((a, b) => a + b, 0)
  if (d === 2) {
    if (!Number.isInteger(total / n)) return null
    const mean = total / n
    return numeric({
      text: `The chart shows monthly fuel uplift. What is the mean monthly uplift over the ${n} months shown?`,
      diagram,
      value: mean,
      format: (x) => `${num(x, 1)} t`,
      traps: [total / (n - 1), (Math.max(...values) + Math.min(...values)) / 2, total / 10].filter((x) => Number.isInteger(x * 10)),
      step: yStep / 2,
      explanation: [`Total = ${values.join(' + ')} = ${total} t.`, `Mean = ${total} ÷ ${n} = ${num(mean)} t.`],
      expectedSeconds: 60,
    })
  }
  const i = r.int(0, n - 2)
  const j = r.int(i + 1, n - 1)
  const p = ((values[j] - values[i]) / values[i]) * 100
  if (!Number.isInteger(p) || p === 0 || Math.abs(p) > 150) return null
  return numeric({
    text: `The chart shows monthly fuel uplift. What was the percentage ${p > 0 ? 'increase' : 'decrease'} from ${labels[i]} to ${labels[j]}?`,
    diagram,
    value: Math.abs(p),
    format: (x) => `${num(x, 1)}%`,
    traps: [round((Math.abs(values[j] - values[i]) / values[j]) * 100, 1), Math.abs(values[j] - values[i])],
    step: 5,
    formula: 'Percentage change = change ÷ original × 100',
    explanation: [`${labels[i]}: ${values[i]} t; ${labels[j]}: ${values[j]} t.`, `Change = ${Math.abs(values[j] - values[i])} t; ÷ ${values[i]} × 100 = ${num(Math.abs(p))}%.`],
    expectedSeconds: 75,
  })
})

const dataTable = tpl('data-table', 'data', (r, d) => {
  const codes = r.shuffle(['KC 851', 'KC 103', 'KC 925', 'KC 341', 'KC 207', 'KC 618']).slice(0, 4)
  if (d === 1) {
    const dist = codes.map(() => r.step(150, 2400, 10))
    const i = r.int(0, 3)
    let j = r.int(0, 3)
    if (i === j) j = (j + 1) % 4
    const v = dist[i] + dist[j]
    return numeric({
      text: `Using the table, what is the combined distance of ${codes[i]} and ${codes[j]}?`,
      diagram: { kind: 'table', title: 'Scheduled sectors', headers: ['Flight', 'Distance (NM)'], rows: codes.map((c, k) => [c, num(dist[k])]) },
      value: v,
      format: (x) => `${num(x)} NM`,
      traps: [Math.abs(dist[i] - dist[j]), dist[i] + dist[(j + 1) % 4 === i ? (j + 2) % 4 : (j + 1) % 4]],
      explanation: [`${codes[i]}: ${num(dist[i])} NM; ${codes[j]}: ${num(dist[j])} NM.`, `Sum = ${num(v)} NM.`],
      expectedSeconds: 30,
    })
  }
  if (d === 2) {
    // Fastest average groundspeed — but not simply the longest or the shortest-time flight.
    for (let i = 0; i < 300; i++) {
    const times = codes.map(() => r.step(40, 240, 10))
    const speeds = codes.map(() => r.step(240, 480, 30))
    const dist = times.map((t, k) => (speeds[k] * t) / 60)
    if (new Set(speeds).size < 4) continue
    const best = speeds.indexOf(Math.max(...speeds))
    if (best === dist.indexOf(Math.max(...dist)) || best === times.indexOf(Math.min(...times))) continue
    return {
      kind: 'text',
      text: 'Which flight in the table had the highest average groundspeed?',
      diagram: { kind: 'table', title: 'Sector log', headers: ['Flight', 'Distance (NM)', 'Time'], rows: codes.map((c, k) => [c, num(dist[k]), hm(times[k])]) },
      correct: codes[best],
      wrong: codes.filter((_, k) => k !== best),
      formula: 'speed = distance ÷ time',
      explanation: [...codes.map((c, k) => `${c}: ${num(dist[k])} ÷ ${num(times[k] / 60, 3)} h = ${speeds[k]} kt.`), `Highest: ${codes[best]}.`],
      expectedSeconds: 80,
    }
    }
    return null
  }
  for (let i = 0; i < 300; i++) {
  const dist = codes.map(() => r.step(200, 1200, 100))
  const rate = codes.map(() => r.int(18, 40) / 4)
  const fuel = dist.map((x, k) => x * rate[k])
  if (new Set(rate).size < 4) continue
  const best = rate.indexOf(Math.min(...rate))
  if (best === fuel.indexOf(Math.min(...fuel))) continue
  return {
    kind: 'text',
    text: 'Which flight in the table used the least fuel per nautical mile?',
    diagram: { kind: 'table', title: 'Fuel log', headers: ['Flight', 'Distance (NM)', 'Fuel used (kg)'], rows: codes.map((c, k) => [c, num(dist[k]), num(fuel[k])]) },
    correct: codes[best],
    wrong: codes.filter((_, k) => k !== best),
    formula: 'fuel per NM = fuel ÷ distance',
    explanation: [...codes.map((c, k) => `${c}: ${num(fuel[k])} ÷ ${num(dist[k])} = ${num(rate[k])} kg/NM.`), `Lowest: ${codes[best]}. The smallest total fuel is not the answer, because the distances differ.`],
    expectedSeconds: 90,
  }
  }
  return null
})

const dataGraph = tpl('data-graph', 'data', (r, d) => {
  // Distance–time graph from four segments on grid points (x in minutes, y in km).
  const xStep = r.pick([10, 15])
  const yStep = r.pick([10, 20])
  for (let tries = 0; tries < 60; tries++) {
    const pts: [number, number][] = [[0, 0]]
    const stop = r.int(1, 3)
    for (let s = 0; s < 4; s++) {
      const [x, y] = pts[pts.length - 1]
      const dx = xStep * r.int(1, 3)
      const dy = s === stop ? 0 : yStep * r.int(1, 4)
      pts.push([x + dx, y + dy])
    }
    const xMax = pts[4][0]
    const yMax = pts[4][1]
    if (xMax > xStep * 10 || yMax > yStep * 10) continue
    const speeds = [0, 1, 2, 3].map((s) => ((pts[s + 1][1] - pts[s][1]) / (pts[s + 1][0] - pts[s][0])) * 60)
    const diagram = {
      kind: 'graph' as const,
      title: 'Distance–time graph',
      xLabel: 'Time (min)',
      yLabel: 'Distance (km)',
      xMax: Math.ceil(xMax / xStep) * xStep,
      yMax: Math.ceil(yMax / yStep) * yStep + yStep,
      xStep,
      yStep,
      points: pts,
      segmentLabels: ['A', 'B', 'C', 'D'],
    }
    const moving = [0, 1, 2, 3].filter((s) => s !== stop)
    if (d === 1) {
      const s = r.pick(moving)
      const v = speeds[s]
      if (!Number.isInteger(v)) continue
      const dy = pts[s + 1][1] - pts[s][1]
      const dx = pts[s + 1][0] - pts[s][0]
      return numeric({
        text: `The graph shows a vehicle's journey. What was its speed during segment ${'ABCD'[s]}?`,
        diagram,
        value: v,
        format: (x) => `${num(x, 1)} km/h`,
        traps: [dy, round(dy / dx, 1), speeds[moving.find((m) => m !== s) ?? s]],
        step: stepFor(v, 5),
        formula: 'speed = gradient = Δdistance ÷ Δtime',
        explanation: [`Segment ${'ABCD'[s]}: ${dy} km in ${dx} min.`, `${dy} ÷ ${num(dx / 60, 3)} h = ${num(v)} km/h.`],
        expectedSeconds: 45,
      })
    }
    if (d === 2) {
      const fastest = moving.reduce((a, b) => (speeds[b] > speeds[a] ? b : a))
      if (moving.filter((m) => speeds[m] === speeds[fastest]).length > 1) continue
      const askStop = r.chance(0.35)
      const correct = askStop ? stop : fastest
      return {
        kind: 'text',
        text: askStop
          ? 'The graph shows a vehicle\'s journey. During which segment was the vehicle stationary?'
          : 'The graph shows a vehicle\'s journey. During which segment was the vehicle travelling fastest?',
        diagram,
        correct: `Segment ${'ABCD'[correct]}`,
        wrong: [0, 1, 2, 3].filter((s) => s !== correct).map((s) => `Segment ${'ABCD'[s]}`),
        fixedOrder: ['Segment A', 'Segment B', 'Segment C', 'Segment D'],
        explanation: askStop
          ? [`A horizontal line means the distance is not changing: segment ${'ABCD'[stop]}.`]
          : [`The steepest line is the fastest. Speeds: ${moving.map((m) => `${'ABCD'[m]} ${num(speeds[m], 1)} km/h`).join(', ')}.`],
        expectedSeconds: 40,
      }
    }
    const avg = (yMax / xMax) * 60
    const movingTime = xMax - (pts[stop + 1][0] - pts[stop][0])
    const avgMoving = (yMax / movingTime) * 60
    if (!Number.isInteger(avg)) continue
    return numeric({
      text: `The graph shows a vehicle's journey. What was its average speed for the whole journey, including the stop?`,
      diagram,
      value: avg,
      format: (x) => `${num(x, 1)} km/h`,
      traps: [round(avgMoving, 1), round(moving.reduce((a, m) => a + speeds[m], 0) / 3, 1), yMax],
      step: stepFor(avg, 2),
      formula: 'average speed = total distance ÷ total time',
      explanation: [`Total distance ${yMax} km in ${xMax} min (${num(xMax / 60, 3)} h).`, `${yMax} ÷ ${num(xMax / 60, 3)} = ${num(avg)} km/h.`],
      expectedSeconds: 70,
    })
  }
  return null
})

/* ======================= 10. Geometry & trigonometry ======================= */

const TRIPLES = [
  [3, 4, 5],
  [5, 12, 13],
  [8, 15, 17],
  [7, 24, 25],
  [20, 21, 29],
]

const geoPyth = tpl('geo-pyth', 'geometry', (r, d) => {
  const [a0, b0, c0] = r.pick(TRIPLES)
  const k = r.int(1, Math.max(1, Math.floor(100 / c0)))
  const [a, b, c] = [a0 * k, b0 * k, c0 * k]
  if (d === 1)
    return numeric({
      text: `A right-angled triangle has shorter sides of ${a} cm and ${b} cm. How long is the hypotenuse?`,
      diagram: { kind: 'triangle', vertical: `${a} cm`, horizontal: `${b} cm`, hypotenuse: '?' },
      value: c,
      format: (x) => `${num(x, 1)} cm`,
      traps: [a + b, round(Math.sqrt(b * b - a * a), 1), c + k],
      formula: 'c² = a² + b²',
      explanation: [`${a}² + ${b}² = ${a * a} + ${b * b} = ${c * c}.`, `√${c * c} = ${c} cm.`],
      expectedSeconds: 40,
    })
  if (d === 2)
    return numeric({
      text: `A right-angled triangle has a hypotenuse of ${c} m and one side of ${b} m. How long is the third side?`,
      diagram: { kind: 'triangle', vertical: '?', horizontal: `${b} m`, hypotenuse: `${c} m` },
      value: a,
      format: (x) => `${num(x, 1)} m`,
      traps: [c - b, round(Math.sqrt(c * c + b * b), 1), (c + b) / 2],
      formula: 'a² = c² − b²',
      explanation: [`${c}² − ${b}² = ${c * c} − ${b * b} = ${a * a}.`, `√${a * a} = ${a} m.`],
      expectedSeconds: 50,
    })
  const back = r.int(1, a - 1)
  const north = a + back
  return numeric({
    text: `An aircraft flies ${north} NM north, then ${b} NM east, then ${back} NM south. How far is it now from its starting point in a straight line?`,
    diagram: { kind: 'triangle', vertical: `${north} − ${back} NM`, horizontal: `${b} NM`, hypotenuse: '?' },
    value: c,
    format: (x) => `${num(x, 1)} NM`,
    traps: [north + b - back, round(Math.sqrt(north * north + b * b), 1), north + b + back],
    formula: 'distance² = (net north)² + (net east)²',
    explanation: [`Net northward distance = ${north} − ${back} = ${a} NM; eastward = ${b} NM.`, `√(${a}² + ${b}²) = √${c * c} = ${c} NM.`],
    expectedSeconds: 75,
  })
})

const geoAngles = tpl('geo-angles', 'geometry', (r, d) => {
  if (d === 1) {
    const A = r.int(25, 100)
    const B = r.int(20, 150 - A)
    const C = 180 - A - B
    return numeric({
      text: `Two angles of a triangle are ${A}° and ${B}°. What is the third angle?`,
      value: C,
      format: (x) => `${num(x)}°`,
      traps: [360 - A - B, A + B, Math.abs(A - B)],
      step: 5,
      formula: 'Angles in a triangle sum to 180°',
      explanation: [`180 − ${A} − ${B} = ${C}°.`],
      expectedSeconds: 20,
    })
  }
  const H = r.step(5, 355, 5)
  if (d === 2) {
    return {
      kind: 'numeric',
      text: `An aircraft is flying on a heading of ${pad3(H)}. What is the reciprocal heading?`,
      value: hdg(H + 180),
      format: pad3,
      traps: [hdg(H + 90), hdg(360 - H), hdg(H - 90)],
      step: 10,
      min: 0,
      max: 359,
      formula: 'Reciprocal = heading ± 180°',
      explanation: [`${H < 180 ? `${H} + 180` : `${H} − 180`} = ${pad3(H + 180)}.`],
      expectedSeconds: 20,
    }
  }
  const a = r.step(20, 120, 5)
  const b = r.step(20, 150, 5)
  const c = r.step(10, 90, 5)
  const v = hdg(H + a - b + c)
  return {
    kind: 'numeric',
    text: `An aircraft on heading ${pad3(H)} turns right ${a}°, then left ${b}°, then right ${c}°. What is its new heading?`,
    value: v,
    format: pad3,
    traps: [hdg(H - a + b - c), hdg(H + a + b + c), hdg(H + a - b - c)],
    step: 10,
    min: 0,
    max: 359,
    formula: 'Right turns add, left turns subtract (wrap around 360°)',
    explanation: [`${H} + ${a} − ${b} + ${c} = ${H + a - b + c}.`, `Wrap into 0–359: ${pad3(v)}.`],
    expectedSeconds: 45,
  }
})

const geoArea = tpl('geo-area', 'geometry', (r, d) => {
  if (d === 1) {
    const l = r.step(1500, 4000, 100)
    const w = r.pick([30, 45, 60])
    const askArea = r.chance(0.6)
    const v = askArea ? l * w : 2 * (l + w)
    return numeric({
      text: `A runway is ${num(l)} m long and ${w} m wide. What is its ${askArea ? 'area' : 'perimeter'}?`,
      value: v,
      format: (x) => (askArea ? `${num(x)} m²` : `${num(x)} m`),
      traps: askArea ? [2 * (l + w), (l * w) / 2, l * w * 10] : [l * w, l + w, 2 * l + w],
      formula: askArea ? 'area = length × width' : 'perimeter = 2 × (length + width)',
      explanation: [askArea ? `${num(l)} × ${w} = ${num(v)} m².` : `2 × (${num(l)} + ${w}) = ${num(v)} m.`],
      expectedSeconds: 25,
    })
  }
  if (d === 2) {
    const rad = r.pick([5, 10, 20, 30, 50])
    const askArea = r.chance(0.5)
    const v = askArea ? 3.14 * rad * rad : 2 * 3.14 * rad
    return numeric({
      text: `A circular holding area has a radius of ${rad} m. What is its ${askArea ? 'area' : 'circumference'}?`,
      given: 'Take π = 3.14',
      value: round(v, 2),
      format: (x) => (askArea ? `${num(x, 2)} m²` : `${num(x, 2)} m`),
      traps: askArea ? [round(2 * 3.14 * rad, 2), round(3.14 * 4 * rad * rad, 2), round(3.14 * rad, 2)] : [round(3.14 * rad * rad, 2), round(3.14 * rad, 2), round(4 * 3.14 * rad, 2)],
      formula: askArea ? 'A = π r²' : 'C = 2 π r',
      explanation: [askArea ? `3.14 × ${rad}² = 3.14 × ${rad * rad} = ${num(v, 2)} m².` : `2 × 3.14 × ${rad} = ${num(v, 2)} m.`],
      expectedSeconds: 40,
    })
  }
  const rad = r.pick([0.5, 1, 1.5, 2])
  const h = r.pick([2, 4, 5, 6, 8, 10])
  const m3 = 3.14 * rad * rad * h
  return numeric({
    text: `A cylindrical fuel tank has a radius of ${num(rad)} m and a length of ${h} m. How many litres does it hold when full?`,
    given: 'Take π = 3.14;  1 m³ = 1,000 L',
    value: round(m3 * 1000, 0),
    format: (x) => `${num(x)} L`,
    traps: [round(3.14 * 4 * rad * rad * h * 1000, 0), round(2 * 3.14 * rad * h * 1000, 0), round(m3 * 100, 0)],
    formula: 'V = π r² h',
    explanation: [`V = 3.14 × ${num(rad)}² × ${h} = ${num(m3, 3)} m³.`, `× 1,000 = ${num(m3 * 1000)} L.`],
    expectedSeconds: 75,
  })
})

const geoTrig = tpl('geo-trig', 'geometry', (r, d) => {
  if (d === 1) {
    const L = r.step(200, 4000, 200)
    const useSin = r.chance(0.5)
    const v = L / 2
    return numeric({
      text: useSin
        ? `An aircraft climbs along a straight path for ${num(L)} m at 30° to the horizontal. How much height does it gain?`
        : `A cable ${num(L)} m long makes an angle of 60° with the ground. How far along the ground does it reach?`,
      given: useSin ? 'sin 30° = 0.5' : 'cos 60° = 0.5',
      diagram: { kind: 'triangle', vertical: useSin ? '?' : '', horizontal: useSin ? '' : '?', hypotenuse: `${num(L)} m`, angle: useSin ? '30°' : '60°' },
      value: v,
      format: (x) => `${num(x, 1)} m`,
      traps: [L * 2, round(L * 0.866, 1), L],
      formula: useSin ? 'opposite = hypotenuse × sin θ' : 'adjacent = hypotenuse × cos θ',
      explanation: [`${num(L)} × 0.5 = ${num(v)} m.`],
      expectedSeconds: 35,
    })
  }
  if (d === 2) {
    const a = r.int(2, 12)
    const D = r.pick([30, 40, 60, 90, 120, 150, 180])
    const X = (a * D) / 60
    if (!Number.isInteger(X)) return null
    return numeric({
      text: `After flying ${D} NM, a pilot finds the aircraft is ${X} NM off track. Using the 1-in-60 rule, what is the track error?`,
      given: '1-in-60 rule: 1 NM off track after 60 NM ≈ 1°',
      value: a,
      format: (x) => `${num(x, 1)}°`,
      traps: [round((X * D) / 60, 1), round(D / X, 1), X],
      step: 1,
      formula: 'track error (°) = distance off × 60 ÷ distance flown',
      explanation: [`${X} × 60 ÷ ${D} = ${a}°.`],
      expectedSeconds: 45,
    })
  }
  for (let i = 0; i < 40; i++) {
    const X = r.int(2, 8)
    const D1 = r.pick([20, 30, 40, 60, 80, 120])
    const D2 = r.pick([20, 30, 40, 60, 80, 120])
    const e1 = (X * 60) / D1
    const e2 = (X * 60) / D2
    if (!Number.isInteger(e1) || !Number.isInteger(e2) || D1 === D2) continue
    return numeric({
      text: `After ${D1} NM a pilot is ${X} NM off track, with ${D2} NM still to go. Using the 1-in-60 rule, by how many degrees must the heading change to arrive at the destination?`,
      given: '1-in-60 rule: 1 NM off track after 60 NM ≈ 1°',
      value: e1 + e2,
      format: (x) => `${num(x, 1)}°`,
      traps: [e1, e2, round((X * 60) / (D1 + D2), 1)],
      step: 1,
      formula: 'correction = track error + closing angle',
      explanation: [
        `Track error = ${X} × 60 ÷ ${D1} = ${e1}° (this regains a parallel track).`,
        `Closing angle = ${X} × 60 ÷ ${D2} = ${e2}° (this aims at the destination).`,
        `Total = ${e1 + e2}°.`,
      ],
      expectedSeconds: 80,
    })
  }
  return null
})

export const MATH_TEMPLATES: Template[] = [
  arOrder,
  arMult,
  arDiv,
  frPercent,
  frRatio,
  frFraction,
  sdtTime,
  sdtSpeed,
  fuelEndurance,
  fuelRequired,
  fuelRemaining,
  unitConv,
  unitTemp,
  timeArrival,
  timeDuration,
  timeZone,
  algLinear,
  algRearrange,
  algFormula,
  algSimul,
  avgMean,
  avgWeighted,
  dataBars,
  dataTable,
  dataGraph,
  geoPyth,
  geoAngles,
  geoArea,
  geoTrig,
]

