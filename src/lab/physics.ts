import { by, num, round, stepFor, type Draft, type NumericDraft, type Template } from './build'
import type { Rng } from './rng'
import type { Diagram, Difficulty, PhysicsTopic } from './types'

/*
 * Physics templates: numerical ones with parameters drawn per question, and
 * conceptual ones drawn from small banks per difficulty. Constants are stated
 * with every question that needs them (g = 10 m/s² unless said otherwise).
 */

const tpl = (
  id: string,
  topic: PhysicsTopic,
  make: (r: Rng, d: Difficulty) => Draft | null,
  levels: Difficulty[] = [1, 2, 3],
): Template => ({ id, subject: 'physics', topic, levels, make })

const G = 'Take g = 10 m/s²'
const clean = (xs: (number | null | undefined)[]) => xs.filter((x): x is number => x != null && Number.isFinite(x))

const numeric = (
  o: Omit<NumericDraft, 'kind' | 'format' | 'step'> & { u: string; dp?: number; step?: number },
): NumericDraft => {
  const { u, dp = 2, ...rest } = o
  return {
    kind: 'numeric',
    format: (v) => (u === '%' ? `${num(v, dp)}%` : `${num(v, dp)} ${u}`),
    step: o.step ?? stepFor(o.value, dp === 0 ? 1 : 10 ** -dp * 10),
    ...rest,
    traps: clean(o.traps).map((t) => round(t, dp)),
    max: o.max ?? (u === '%' ? 100 : undefined),
  }
}

interface Concept {
  q: string
  a: string
  w: string[]
  e: string
  diagram?: Diagram
}

const concept = (id: string, topic: PhysicsTopic, bank: Record<Difficulty, Concept[]>) =>
  tpl(id, topic, (r, d) => {
    const c = r.pick(bank[d])
    return {
      kind: 'text',
      text: c.q,
      correct: c.a,
      wrong: c.w,
      diagram: c.diagram,
      explanation: [c.e],
      expectedSeconds: by(d, 25, 35, 50),
    }
  })

/* ======================= 1. Newton's laws ======================= */

const newtonConcept = concept('nw-concept', 'newton', {
  1: [
    { q: 'A puck slides across perfectly frictionless ice. What happens to its motion?', a: 'It keeps moving at constant velocity', w: ['It gradually slows down and stops', 'It speeds up', 'It moves in a circle'], e: "Newton's first law: with no resultant force, velocity does not change." },
    { q: 'A book rests on a table. Which statement is correct?', a: 'The resultant force on the book is zero', w: ['There are no forces acting on the book', 'Only gravity acts on the book', 'The table pushes up harder than gravity pulls down'], e: 'Weight acts down and the table pushes up equally, so the forces balance.' },
    { q: 'A passenger lurches forward when a bus brakes suddenly. Why?', a: 'The passenger tends to keep moving due to inertia', w: ['The brakes push the passenger forward', 'Gravity increases during braking', 'The seat pulls the passenger forward'], e: 'The bus decelerates but the passenger tends to continue at the original velocity (inertia).' },
    { q: 'Which unit is used for force?', a: 'Newton (N)', w: ['Joule (J)', 'Watt (W)', 'Pascal (Pa)'], e: '1 N is the force that accelerates 1 kg at 1 m/s².' },
  ],
  2: [
    { q: 'An aircraft is flying straight and level at constant speed. Which statement about the forces acting on it is correct?', a: 'Lift equals weight, and thrust equals drag', w: ['Lift exceeds weight', 'Thrust exceeds drag', 'Weight exceeds lift'], e: 'Constant velocity means zero resultant force, so opposing forces balance in both directions.' },
    { q: 'A person pushes on a wall with 200 N. What force does the wall exert on the person?', a: '200 N, in the opposite direction', w: ['0 N, because the wall does not move', '200 N, in the same direction', 'Less than 200 N, because the wall is rigid'], e: "Newton's third law: forces between two bodies are equal in size and opposite in direction." },
    { q: 'The same resultant force acts on a 2 kg and a 4 kg trolley. How do their accelerations compare?', a: 'The 2 kg trolley accelerates twice as fast', w: ['Both accelerate equally', 'The 4 kg trolley accelerates twice as fast', 'The 2 kg trolley accelerates four times as fast'], e: 'a = F / m, so halving the mass doubles the acceleration.' },
    { q: 'A jet engine pushes exhaust gas backwards. Why does the aircraft move forward?', a: 'The gas pushes the engine forward with an equal and opposite force', w: ['The exhaust pushes against the air behind the aircraft', 'Air pressure in front of the aircraft drops', 'Gravity pulls the aircraft forward'], e: "Newton's third law: the engine pushes gas backwards, the gas pushes the engine forwards." },
  ],
  3: [
    { q: 'An aircraft descends in a straight line at constant speed. What is the resultant force on it?', a: 'Zero', w: ['Downwards, equal to its weight', 'Downwards, slightly less than its weight', 'Forwards, equal to the thrust'], e: 'Constant velocity (speed and direction) means zero acceleration, so the resultant force is zero — even while descending.' },
    { q: 'The Earth pulls a falling apple down with a force of 1 N. Which is the reaction force to this, in the sense of Newton\'s third law?', a: 'The apple pulls the Earth up with 1 N', w: ['Air resistance pushes the apple up with 1 N', 'The ground pushes the apple up with 1 N when it lands', 'There is no reaction force while it falls'], e: 'Third-law pairs act on different bodies and are the same type of force: gravity on the apple ↔ gravity on the Earth.' },
    { q: 'A skydiver opens the parachute while falling at terminal velocity. What happens immediately afterwards?', a: 'The resultant force is upward and the skydiver decelerates', w: ['The skydiver starts moving upwards', 'The resultant force stays zero', 'The skydiver accelerates downwards'], e: 'Drag suddenly exceeds weight, so the resultant force is upward and the downward speed falls until a new, lower terminal velocity is reached.' },
    { q: 'A lift (elevator) moves upward at constant speed. How does the floor\'s push on a passenger compare with the passenger\'s weight?', a: 'It is equal to the weight', w: ['It is greater than the weight', 'It is less than the weight', 'It is zero'], e: 'Constant velocity: zero acceleration, so the upward push equals the weight. It is greater only while the lift accelerates upward.' },
  ],
})

const newtonNet = tpl('nw-net', 'newton', (r, d) => {
  const m = r.step(500, 3000, 100)
  const a = r.pick([0.5, 1, 1.5, 2, 2.5, 3])
  const D = r.step(1000, 8000, 500)
  const T = D + m * a
  if (!Number.isInteger(T)) return null
  const diagram: Diagram = { kind: 'forces', body: `${num(m)} kg`, arrows: [{ dir: 'right', label: `Thrust ${num(T)} N` }, { dir: 'left', label: `Drag ${num(D)} N` }] }
  if (d === 1)
    return numeric({
      text: `An aircraft has a thrust of ${num(T)} N and drag of ${num(D)} N. What is the resultant horizontal force?`,
      diagram,
      value: T - D,
      u: 'N',
      traps: [T + D, T, (T - D) / 2],
      formula: 'resultant = thrust − drag',
      explanation: [`The forces act in opposite directions: ${num(T)} − ${num(D)} = ${num(T - D)} N forward.`],
      expectedSeconds: 25,
    })
  if (d === 2)
    return numeric({
      text: `An aircraft of mass ${num(m)} kg has a thrust of ${num(T)} N and drag of ${num(D)} N. What is its acceleration?`,
      diagram,
      value: a,
      u: 'm/s²',
      traps: [T / m, (T + D) / m, (T - D) / (m * 10)],
      step: 0.5,
      formula: 'a = (thrust − drag) / m',
      explanation: [`Resultant = ${num(T - D)} N.`, `a = ${num(T - D)} ÷ ${num(m)} = ${num(a)} m/s².`],
      expectedSeconds: 45,
    })
  return numeric({
    text: `An aircraft of mass ${num(m)} kg must accelerate along the runway at ${num(a)} m/s². Drag and rolling resistance total ${num(D)} N. What thrust is required?`,
    diagram: { kind: 'forces', body: `${num(m)} kg`, arrows: [{ dir: 'right', label: 'Thrust ?' }, { dir: 'left', label: `Resistance ${num(D)} N` }] },
    value: T,
    u: 'N',
    traps: [m * a, D - m * a, D + m * a * 10],
    formula: 'thrust = resistance + m a',
    explanation: [`Force needed to accelerate = ${num(m)} × ${num(a)} = ${num(m * a)} N.`, `Plus the resistance: ${num(m * a)} + ${num(D)} = ${num(T)} N.`],
    expectedSeconds: 60,
  })
})

/* ======================= 2. Force, mass, weight, acceleration ======================= */

const forceWeight = tpl('fo-weight', 'forces', (r, d) => {
  if (d === 1) {
    const m = r.step(5, 900, 5)
    return numeric({
      text: `What is the weight of a ${num(m)} kg mass on Earth?`,
      given: G,
      value: m * 10,
      u: 'N',
      traps: [m, m / 10, m * 100],
      formula: 'W = m g',
      explanation: [`W = ${num(m)} × 10 = ${num(m * 10)} N.`],
      expectedSeconds: 20,
    })
  }
  if (d === 2) {
    const m = r.step(10, 200, 5)
    const W = m * 10
    return numeric({
      text: `An instrument weighs ${num(W)} N on Earth. What does it weigh on the Moon?`,
      given: 'g on Earth = 10 m/s²;  g on the Moon = 1.6 m/s²',
      value: m * 1.6,
      u: 'N',
      traps: [W * 1.6, W / 1.6, m],
      formula: 'm = W / g;  W_moon = m × 1.6',
      explanation: [`Mass = ${num(W)} ÷ 10 = ${num(m)} kg (mass does not change).`, `Weight on the Moon = ${num(m)} × 1.6 = ${num(m * 1.6)} N.`],
      expectedSeconds: 40,
    })
  }
  const m = r.step(500, 5000, 100)
  const a = r.pick([0.5, 1, 1.5, 2, 2.5])
  const up = r.chance(0.6)
  const L = m * (10 + (up ? a : -a))
  return numeric({
    text: `A helicopter of mass ${num(m)} kg is ${up ? 'accelerating upwards' : 'accelerating downwards'} at ${num(a)} m/s². What lift force is the rotor producing?`,
    given: G,
    diagram: { kind: 'forces', body: `${num(m)} kg`, arrows: [{ dir: 'up', label: 'Lift ?' }, { dir: 'down', label: `Weight ${num(m * 10)} N` }] },
    value: L,
    u: 'N',
    traps: [m * 10, m * a, m * (10 + (up ? -a : a))],
    formula: 'L − m g = m a  (upward positive)',
    explanation: [`Weight = ${num(m * 10)} N.`, `Resultant needed = ${num(m)} × ${num(a)} = ${num(m * a)} N ${up ? 'upwards' : 'downwards'}.`, `L = ${num(m * 10)} ${up ? '+' : '−'} ${num(m * a)} = ${num(L)} N.`],
    expectedSeconds: 70,
  })
})

const forceFma = tpl('fo-fma', 'forces', (r, d) => {
  if (d === 1) {
    const m = r.step(2, 50, 1)
    const a = r.int(2, 12)
    const F = m * a
    return numeric({
      text: `A resultant force of ${num(F)} N acts on a ${m} kg trolley. What is its acceleration?`,
      value: a,
      u: 'm/s²',
      traps: [F * m, m / F, F - m],
      step: 1,
      formula: 'a = F / m',
      explanation: [`a = ${num(F)} ÷ ${m} = ${a} m/s².`],
      expectedSeconds: 20,
    })
  }
  if (d === 2) {
    const m = r.step(600, 2400, 50)
    const u = r.int(0, 25)
    const t = r.int(2, 12)
    const a = r.pick([0.5, 1, 1.5, 2, 2.5, 3, 4, 5])
    const v = u + a * t
    if (!Number.isInteger(v)) return null
    return numeric({
      text: `A ${num(m)} kg vehicle accelerates uniformly from ${u} m/s to ${num(v)} m/s in ${t} seconds. What is the resultant force acting on it?`,
      value: m * a,
      u: 'N',
      traps: [(m * v) / t, m * (v - u), (m * (v + u)) / t],
      formula: 'a = (v − u) / t;  F = m a',
      explanation: [`a = (${num(v)} − ${u}) ÷ ${t} = ${num(a)} m/s².`, `F = ${num(m)} × ${num(a)} = ${num(m * a)} N.`],
      expectedSeconds: 50,
    })
  }
  const m = r.step(1000, 2000, 100)
  const v = r.pick([10, 20, 30])
  const s = r.pick([20, 25, 40, 50, 100])
  const a = (v * v) / (2 * s)
  if (!Number.isInteger(a * 10)) return null
  return numeric({
    text: `A ${num(m)} kg car travelling at ${v} m/s brakes to a stop over ${s} m. What is the average braking force?`,
    value: m * a,
    u: 'N',
    traps: [(m * v) / s, (m * v * v) / s, m * a * 10],
    formula: 'v² = u² + 2 a s;  F = m a',
    explanation: [`a = v² ÷ (2s) = ${v * v} ÷ ${2 * s} = ${num(a)} m/s².`, `F = ${num(m)} × ${num(a)} = ${num(m * a)} N.`],
    expectedSeconds: 75,
  })
})

/* ======================= 3. Speed, velocity, acceleration ======================= */

const motionAccel = tpl('mo-accel', 'motion', (r, d) => {
  if (d === 1) {
    const a = r.int(1, 8)
    const t = r.int(2, 12)
    const u = r.step(0, 30, 5)
    const v = u + a * t
    return numeric({
      text: `A car speeds up from ${u} m/s to ${v} m/s in ${t} s. What is its acceleration?`,
      value: a,
      u: 'm/s²',
      traps: [v / t, (v + u) / t, (v - u) * t],
      step: 1,
      formula: 'a = (v − u) / t',
      explanation: [`a = (${v} − ${u}) ÷ ${t} = ${a} m/s².`],
      expectedSeconds: 25,
    })
  }
  if (d === 2) {
    const u = r.step(0, 40, 10)
    const v = u + r.step(10, 60, 10)
    const t = r.int(4, 20)
    const s = ((u + v) / 2) * t
    return numeric({
      text: `An aircraft accelerates uniformly from ${u} m/s to ${v} m/s in ${t} s. How far does it travel in that time?`,
      value: s,
      u: 'm',
      traps: [v * t, (v - u) * t, ((v - u) / 2) * t],
      formula: 's = ½ (u + v) t',
      explanation: [`Average speed = (${u} + ${v}) ÷ 2 = ${(u + v) / 2} m/s.`, `s = ${(u + v) / 2} × ${t} = ${num(s)} m.`],
      expectedSeconds: 45,
    })
  }
  for (let i = 0; i < 40; i++) {
    const a = r.pick([1, 2, 2.5, 4, 5])
    const s = r.step(100, 2000, 50)
    const u = r.pick([0, 10, 20])
    const v2 = u * u + 2 * a * s
    const v = Math.sqrt(v2)
    if (!Number.isInteger(v)) continue
    return numeric({
      text: `An aircraft starts its take-off roll at ${u} m/s and accelerates at ${num(a)} m/s² over ${num(s)} m. What speed does it reach?`,
      value: v,
      u: 'm/s',
      traps: [u + 2 * a * s > 2000 ? null : u + a * s, round(Math.sqrt(2 * a * s), 1), round(Math.sqrt(a * s + u * u), 1)],
      step: 5,
      formula: 'v² = u² + 2 a s',
      explanation: [`v² = ${u}² + 2 × ${num(a)} × ${num(s)} = ${num(v2)}.`, `v = √${num(v2)} = ${v} m/s.`],
      expectedSeconds: 75,
    })
  }
  return null
})

const motionGraph = tpl('mo-vt', 'motion', (r, d) => {
  for (let tries = 0; tries < 40; tries++) {
    const xStep = r.pick([2, 5])
    const yStep = r.pick([2, 5, 10])
    const t1 = xStep * r.int(1, 3)
    const v1 = yStep * r.int(2, 6)
    const t2 = t1 + xStep * r.int(1, 3)
    const t3 = t2 + xStep * r.int(1, 3)
    const pts: [number, number][] = [[0, 0], [t1, v1], [t2, v1], [t3, 0]]
    const diagram: Diagram = {
      kind: 'graph',
      title: 'Velocity–time graph',
      xLabel: 'Time (s)',
      yLabel: 'Velocity (m/s)',
      xMax: t3,
      yMax: v1 + yStep,
      xStep,
      yStep,
      points: pts,
      segmentLabels: ['A', 'B', 'C'],
    }
    if (t3 / xStep > 10 || (v1 + yStep) / yStep > 10) continue
    if (d === 1) {
      const a = v1 / t1
      if (!Number.isInteger(a * 100)) continue
      return numeric({
        text: 'The graph shows a vehicle starting from rest. What is its acceleration during segment A?',
        diagram,
        value: a,
        u: 'm/s²',
        dp: 2,
        traps: [v1 * t1, t1 / v1, v1],
        step: stepFor(a, 0.5),
        formula: 'acceleration = gradient of a velocity–time graph',
        explanation: [`Velocity rises by ${v1} m/s in ${t1} s.`, `a = ${v1} ÷ ${t1} = ${num(a, 2)} m/s².`],
        expectedSeconds: 40,
      })
    }
    const area = 0.5 * t1 * v1 + (t2 - t1) * v1 + 0.5 * (t3 - t2) * v1
    if (d === 2) {
      return numeric({
        text: 'The graph shows a vehicle\'s journey. How far does it travel in total?',
        diagram,
        value: area,
        u: 'm',
        dp: 1,
        traps: [v1 * t3, (t2 - t1) * v1, 0.5 * v1 * t3],
        formula: 'distance = area under a velocity–time graph',
        explanation: [`A: ½ × ${t1} × ${v1} = ${num(0.5 * t1 * v1)} m.`, `B: ${t2 - t1} × ${v1} = ${num((t2 - t1) * v1)} m.`, `C: ½ × ${t3 - t2} × ${v1} = ${num(0.5 * (t3 - t2) * v1)} m.`, `Total = ${num(area)} m.`],
        expectedSeconds: 70,
      })
    }
    const avg = area / t3
    if (!Number.isInteger(avg * 10)) continue
    return numeric({
      text: 'The graph shows a vehicle\'s journey. What is its average speed over the whole journey?',
      diagram,
      value: avg,
      u: 'm/s',
      dp: 1,
      traps: [v1 / 2, v1, round(area / (t2 - t1), 1)],
      step: stepFor(avg, 0.5),
      formula: 'average speed = total distance ÷ total time',
      explanation: [`Distance = area = ${num(area)} m.`, `Average = ${num(area)} ÷ ${t3} = ${num(avg)} m/s.`],
      expectedSeconds: 85,
    })
  }
  return null
})

const motionConcept = concept('mo-concept', 'motion', {
  1: [
    { q: 'Which of these is a vector quantity?', a: 'Velocity', w: ['Speed', 'Distance', 'Time'], e: 'A vector has size and direction; velocity is speed in a stated direction.' },
    { q: 'On a distance–time graph, what does a horizontal line show?', a: 'The object is stationary', w: ['Constant speed', 'Constant acceleration', 'Deceleration'], e: 'Distance is not changing, so the object is not moving.' },
    { q: 'On a distance–time graph, what does the gradient represent?', a: 'Speed', w: ['Acceleration', 'Distance travelled', 'Force'], e: 'Gradient = change in distance ÷ change in time = speed.' },
  ],
  2: [
    { q: 'A car drives round a roundabout at a constant 30 km/h. Is it accelerating?', a: 'Yes, because its direction is changing', w: ['No, because its speed is constant', 'Only if it speeds up', 'No, because the roundabout is flat'], e: 'Acceleration is a change in velocity; changing direction changes velocity.' },
    { q: 'On a velocity–time graph, what does the area under the line represent?', a: 'Distance travelled', w: ['Acceleration', 'Speed', 'Time taken'], e: 'Area = velocity × time = distance.' },
    { q: 'Ignoring air resistance, a hammer and a feather are dropped together from the same height. What happens?', a: 'They land at the same time', w: ['The hammer lands first', 'The feather lands first', 'It depends on the shape of the hammer'], e: 'Without air resistance all objects fall with the same acceleration g.' },
  ],
  3: [
    { q: 'A ball is thrown straight up. At the highest point, which statement is correct?', a: 'Its velocity is zero but its acceleration is 9.8 m/s² downwards', w: ['Both velocity and acceleration are zero', 'Its acceleration is zero but it is still moving', 'Its acceleration is upwards'], e: 'Gravity keeps acting the whole time; only the velocity is momentarily zero.' },
    { q: 'A runner completes one lap of a 400 m track in 80 s, finishing where she started. What is her average velocity?', a: '0 m/s', w: ['5 m/s', '400 m/s', '80 m/s'], e: 'Displacement is zero after a full lap, so average velocity is zero (average speed is 5 m/s).' },
    { q: 'On a velocity–time graph, a line slopes downwards but stays above the time axis. What is the object doing?', a: 'Moving forwards while slowing down', w: ['Moving backwards', 'Stationary', 'Speeding up in reverse'], e: 'Positive velocity means moving forwards; a negative gradient means it is decelerating.' },
  ],
})

/* ======================= 4. Work, energy, power, efficiency ======================= */

const energyWork = tpl('en-work', 'energy', (r, d) => {
  if (d === 1) {
    const F = r.step(20, 800, 10)
    const s = r.int(2, 40)
    return numeric({
      text: `A force of ${num(F)} N pushes a cart ${s} m in the direction of the force. How much work is done?`,
      value: F * s,
      u: 'J',
      traps: [F / s, F + s, (F * s) / 2],
      formula: 'W = F × d',
      explanation: [`W = ${num(F)} × ${s} = ${num(F * s)} J.`],
      expectedSeconds: 20,
    })
  }
  const m = r.step(20, 400, 10)
  const h = r.int(2, 30)
  const t = r.pick([2, 4, 5, 8, 10, 20])
  const E = m * 10 * h
  if (d === 2) {
    if (!Number.isInteger(E / t)) return null
    return numeric({
      text: `A winch lifts a ${num(m)} kg load through ${h} m in ${t} s. What useful power does it deliver?`,
      given: G,
      value: E / t,
      u: 'W',
      traps: [(m * h) / t, E, (E * t) / 100],
      formula: 'P = E / t = m g h / t',
      explanation: [`Energy = ${num(m)} × 10 × ${h} = ${num(E)} J.`, `P = ${num(E)} ÷ ${t} = ${num(E / t)} W.`],
      expectedSeconds: 50,
    })
  }
  for (let i = 0; i < 30; i++) {
    const eff = r.pick([40, 50, 60, 75, 80])
    const Pin = (E / t) * (100 / eff)
    if (!Number.isInteger(Pin)) continue
    return numeric({
      text: `A motor takes in ${num(Pin)} W of electrical power and lifts a ${num(m)} kg load through ${h} m in ${t} s. What is its efficiency?`,
      given: G,
      value: eff,
      u: '%',
      dp: 1,
      traps: [round(((m * h) / t / Pin) * 100, 1), 100 - eff, E / Pin <= 1 ? round((E / Pin) * 100, 1) : null],
      step: 5,
      formula: 'efficiency = useful power out ÷ power in × 100%',
      explanation: [`Useful power = ${num(m)} × 10 × ${h} ÷ ${t} = ${num(E / t)} W.`, `Efficiency = ${num(E / t)} ÷ ${num(Pin)} × 100 = ${eff}%.`],
      expectedSeconds: 80,
    })
  }
  return null
})

const energyKinetic = tpl('en-ke', 'energy', (r, d) => {
  if (d === 1) {
    const m = r.step(2, 100, 2)
    const v = r.int(2, 20)
    const KE = 0.5 * m * v * v
    return numeric({
      text: `What is the kinetic energy of a ${m} kg object moving at ${v} m/s?`,
      value: KE,
      u: 'J',
      traps: [m * v * v, 0.5 * m * v, m * v],
      formula: 'KE = ½ m v²',
      explanation: [`KE = ½ × ${m} × ${v}² = ½ × ${m} × ${v * v} = ${num(KE)} J.`],
      expectedSeconds: 30,
    })
  }
  if (d === 2) {
    const v = r.pick([10, 20, 30, 40])
    const h = (v * v) / 20
    return numeric({
      text: `A ball is dropped from a height of ${num(h)} m. Ignoring air resistance, how fast is it moving just before it hits the ground?`,
      given: G,
      value: v,
      u: 'm/s',
      traps: [round(Math.sqrt(10 * h), 1), v / 2, 2 * v],
      step: 5,
      formula: 'm g h = ½ m v²  →  v = √(2 g h)',
      explanation: [`Potential energy becomes kinetic energy; the mass cancels.`, `v = √(2 × 10 × ${num(h)}) = √${num(20 * h)} = ${v} m/s.`],
      expectedSeconds: 55,
    })
  }
  const v1 = r.step(50, 150, 10)
  const k = r.pick([1.5, 2, 3])
  const v2 = v1 * k
  const KE1 = r.step(100, 900, 50)
  return numeric({
    text: `An aircraft has ${num(KE1)} kJ of kinetic energy at ${v1} kt. How much kinetic energy does it have at ${num(v2)} kt, with the same mass?`,
    value: KE1 * k * k,
    u: 'kJ',
    traps: [KE1 * k, KE1 * k * 2, KE1 + (v2 - v1)],
    formula: 'KE ∝ v²',
    explanation: [`The speed increases by a factor of ${num(k)}.`, `KE increases by ${num(k)}² = ${num(k * k)}: ${num(KE1)} × ${num(k * k)} = ${num(KE1 * k * k)} kJ.`],
    expectedSeconds: 55,
  })
})

const energyConcept = concept('en-concept', 'energy', {
  1: [
    { q: 'What energy transfer happens in a torch (flashlight) battery when the torch is switched on?', a: 'Chemical energy to electrical energy', w: ['Electrical energy to chemical energy', 'Light energy to chemical energy', 'Kinetic energy to chemical energy'], e: 'Reactions in the cell release stored chemical energy as electrical energy, which the bulb turns into light and heat.' },
    { q: 'A ball is lifted onto a high shelf. Which store of energy increases?', a: 'Gravitational potential energy', w: ['Kinetic energy', 'Elastic potential energy', 'Thermal energy of the ball'], e: 'Raising an object increases its gravitational potential energy (m g h).' },
    { q: 'What is the unit of power?', a: 'Watt (W)', w: ['Joule (J)', 'Newton (N)', 'Volt (V)'], e: '1 W = 1 J transferred per second.' },
  ],
  2: [
    { q: 'A machine is claimed to have an efficiency of 120%. Why is this impossible?', a: 'It would produce more energy than it takes in', w: ['Efficiency is measured in joules', 'All machines are 100% efficient', 'Efficiency cannot be above 50%'], e: 'Energy is conserved, so useful output can never exceed input.' },
    { q: 'A pendulum swings back and forth. At the lowest point of its swing, which is greatest?', a: 'Kinetic energy', w: ['Gravitational potential energy', 'Elastic energy', 'Chemical energy'], e: 'At the lowest point it has lost the most height, which has become kinetic energy.' },
    { q: 'Two cranes lift identical loads through the same height. Crane X takes 10 s and crane Y takes 20 s. Which statement is true?', a: 'Both do the same work, but X has twice the power', w: ['X does twice as much work', 'Y has twice the power', 'Both have the same power'], e: 'Work = m g h is the same; power = work ÷ time, so the faster crane has more power.' },
  ],
  3: [
    { q: 'If a car\'s speed doubles, what happens to the minimum braking distance (same braking force)?', a: 'It becomes four times as long', w: ['It doubles', 'It stays the same', 'It becomes eight times as long'], e: 'Braking work F × d must remove ½ m v²; KE ∝ v², so distance ∝ v².' },
    { q: 'A glider descends at constant speed. What happens to its energy?', a: 'Potential energy is transferred to thermal energy by drag', w: ['Potential energy becomes kinetic energy', 'Its total mechanical energy stays constant', 'Kinetic energy becomes potential energy'], e: 'Constant speed means KE is constant, so the lost potential energy goes into heating the air through drag.' },
    { q: 'A ball dropped from 2 m bounces back to 1.5 m. What fraction of its energy was lost in the bounce?', a: '25%', w: ['75%', '50%', '0%, energy is conserved'], e: 'Potential energy ∝ height: 1.5 / 2 = 75% is kept, so 25% became heat and sound.' },
  ],
})

/* ======================= 5. Momentum and collisions ======================= */

const momentumCalc = tpl('mom-calc', 'momentum', (r, d) => {
  if (d === 1) {
    const m = r.step(2, 2000, 2)
    const v = r.int(2, 30)
    return numeric({
      text: `What is the momentum of a ${num(m)} kg object moving at ${v} m/s?`,
      value: m * v,
      u: 'kg m/s',
      traps: [0.5 * m * v * v, m / v, m + v],
      formula: 'p = m v',
      explanation: [`p = ${num(m)} × ${v} = ${num(m * v)} kg m/s.`],
      expectedSeconds: 20,
    })
  }
  if (d === 2) {
    for (let i = 0; i < 40; i++) {
      const m1 = r.step(500, 3000, 100)
      const m2 = r.step(500, 3000, 100)
      const v1 = r.int(4, 20)
      const v = (m1 * v1) / (m1 + m2)
      if (!Number.isInteger(v * 10)) continue
      return numeric({
        text: `A ${num(m1)} kg trolley moving at ${v1} m/s collides with a stationary ${num(m2)} kg trolley. They couple together. What is their speed just after the collision?`,
        value: v,
        u: 'm/s',
        dp: 1,
        traps: [v1 / 2, (m2 * v1) / (m1 + m2), (m1 * v1) / m2],
        step: stepFor(v, 0.5),
        formula: 'm₁u₁ = (m₁ + m₂) v',
        explanation: [`Momentum before = ${num(m1)} × ${v1} = ${num(m1 * v1)} kg m/s.`, `v = ${num(m1 * v1)} ÷ ${num(m1 + m2)} = ${num(v)} m/s.`],
        expectedSeconds: 55,
      })
    }
    return null
  }
  if (r.chance(0.5)) {
    const m = r.step(500, 2000, 100)
    const v = r.int(5, 30)
    const t = r.pick([0.05, 0.1, 0.2, 0.5])
    const F = (m * v) / t
    return numeric({
      text: `A ${num(m)} kg car travelling at ${v} m/s is brought to rest in a crash lasting ${num(t)} s. What is the average force on the car?`,
      value: F,
      u: 'N',
      traps: [m * v * t, m * v, (0.5 * m * v * v) / t],
      formula: 'F = Δp / t',
      explanation: [`Change in momentum = ${num(m)} × ${v} = ${num(m * v)} kg m/s.`, `F = ${num(m * v)} ÷ ${num(t)} = ${num(F)} N.`],
      expectedSeconds: 60,
    })
  }
  for (let i = 0; i < 40; i++) {
    const m1 = r.step(1, 10, 1) * 100
    const m2 = r.step(1, 10, 1) * 100
    const u1 = r.int(3, 12)
    const u2 = r.int(2, 10)
    const v = (m1 * u1 - m2 * u2) / (m1 + m2)
    if (!Number.isInteger(v * 10) || v === 0) continue
    return numeric({
      text: `A ${m1} kg cart moving east at ${u1} m/s collides head-on with a ${m2} kg cart moving west at ${u2} m/s. They stick together. What is their velocity afterwards? (East positive.)`,
      value: v,
      u: 'm/s',
      dp: 1,
      min: -50,
      traps: [(m1 * u1 + m2 * u2) / (m1 + m2), -v, (u1 - u2) / 2],
      step: stepFor(v, 0.5),
      formula: 'm₁u₁ + m₂u₂ = (m₁ + m₂) v, with directions as signs',
      explanation: [`Momentum before = ${m1} × ${u1} + ${m2} × (−${u2}) = ${num(m1 * u1 - m2 * u2)} kg m/s.`, `v = ${num(m1 * u1 - m2 * u2)} ÷ ${m1 + m2} = ${num(v)} m/s (${v > 0 ? 'east' : 'west'}).`],
      expectedSeconds: 85,
    })
  }
  return null
})

const momentumConcept = concept('mom-concept', 'momentum', {
  1: [
    { q: 'Which two quantities is momentum calculated from?', a: 'Mass and velocity', w: ['Force and time', 'Mass and acceleration', 'Energy and time'], e: 'p = m v.' },
    { q: 'Which has the most momentum?', a: 'A 1,000 kg car at 20 m/s', w: ['A 60 kg runner at 8 m/s', 'A 0.1 kg ball at 40 m/s', 'A 5,000 kg truck at rest'], e: '1,000 × 20 = 20,000 kg m/s; the others are 480, 4 and 0.' },
    { q: 'In a collision with no external forces, what happens to the total momentum?', a: 'It stays the same', w: ['It increases', 'It decreases', 'It becomes zero'], e: 'Momentum is conserved in every collision when no external force acts.' },
  ],
  2: [
    { q: 'Why do airbags reduce injuries in a crash?', a: 'They increase the time taken to stop, reducing the force', w: ['They reduce the passenger\'s momentum before the crash', 'They make the car stop faster', 'They absorb all the momentum instantly'], e: 'F = Δp / t: the same change of momentum over a longer time needs a smaller force.' },
    { q: 'A gun fires a bullet forwards. What happens to the gun?', a: 'It recoils backwards with equal and opposite momentum', w: ['It stays still because it is heavier', 'It moves forwards with the bullet', 'It recoils with the same speed as the bullet'], e: 'Total momentum was zero before firing and stays zero, so the gun moves backwards (slower, as it is heavier).' },
    { q: 'A rocket in deep space fires its engine. Why does it accelerate even though there is no air to push against?', a: 'Expelled gas carries momentum backwards, so the rocket gains momentum forwards', w: ['The gas pushes against the vacuum', 'Gravity pulls it forwards', 'It cannot accelerate in a vacuum'], e: 'Conservation of momentum works anywhere; no air is needed.' },
  ],
  3: [
    { q: 'Two identical cars travelling at the same speed collide head-on and stop dead. What was the total momentum before the collision?', a: 'Zero', w: ['Twice the momentum of one car', 'The momentum of one car', 'It cannot be determined'], e: 'Equal momenta in opposite directions add to zero, and it is still zero after they stop.' },
    { q: 'A ball hits a wall at 10 m/s and bounces straight back at 10 m/s. What can you say about its change in momentum?', a: 'It is twice the momentum it had before the impact', w: ['It is zero, because the speed is unchanged', 'It equals its momentum before the impact', 'It is half its momentum before the impact'], e: 'Velocity goes from +10 to −10 m/s: Δp = m × 20, twice the original momentum.' },
    { q: 'In a perfectly inelastic collision (objects stick together), which quantity is NOT conserved?', a: 'Kinetic energy', w: ['Momentum', 'Total energy', 'Total mass'], e: 'Momentum and total energy are conserved; some kinetic energy becomes heat and sound.' },
  ],
})

/* ======================= 6. Pressure, density, fluids ======================= */

const pressureCalc = tpl('pr-pressure', 'pressure', (r, d) => {
  if (d === 1) {
    const A = r.pick([0.5, 1, 2, 4, 5])
    const p = r.step(100, 5000, 100)
    const F = p * A
    return numeric({
      text: `A force of ${num(F)} N acts evenly on an area of ${num(A)} m². What pressure does it exert?`,
      value: p,
      u: 'Pa',
      traps: [F * A, p / 10, F],
      formula: 'p = F / A',
      explanation: [`p = ${num(F)} ÷ ${num(A)} = ${num(p)} Pa.`],
      expectedSeconds: 20,
    })
  }
  if (d === 2) {
    const m = r.step(40, 100, 10)
    const cm2 = r.pick([100, 200, 250, 400, 500])
    const A = cm2 / 10000
    const p = (m * 10) / A
    return numeric({
      text: `A ${m} kg person stands on a board with a contact area of ${cm2} cm². What pressure does the board exert on the ground?`,
      given: `${G};  1 m² = 10,000 cm²`,
      value: p,
      u: 'Pa',
      traps: [(m * 10) / cm2, m / A, (m * 10) / (cm2 / 100)],
      formula: 'p = F / A  (A in m²)',
      explanation: [`F = ${m} × 10 = ${m * 10} N.`, `A = ${cm2} ÷ 10,000 = ${num(A, 4)} m².`, `p = ${m * 10} ÷ ${num(A, 4)} = ${num(p)} Pa.`],
      expectedSeconds: 55,
    })
  }
  const h = r.int(2, 40)
  const withAtm = r.chance(0.5)
  const kPa = h * 10 + (withAtm ? 100 : 0)
  return numeric({
    text: withAtm
      ? `What is the total pressure on a diver ${h} m below the surface of fresh water? Atmospheric pressure is 100 kPa.`
      : `What is the pressure due to the water alone at a depth of ${h} m in fresh water?`,
    given: `${G};  density of water = 1,000 kg/m³`,
    value: kPa,
    u: 'kPa',
    traps: withAtm ? [h * 10, h + 100, h * 100 + 100] : [h, h * 100, h * 10 + 100],
    formula: 'p = ρ g h',
    explanation: [`ρ g h = 1,000 × 10 × ${h} = ${num(h * 10000)} Pa = ${h * 10} kPa.`, ...(withAtm ? [`Total = ${h * 10} + 100 = ${kPa} kPa.`] : [])],
    expectedSeconds: 60,
  })
})

const densityCalc = tpl('pr-density', 'pressure', (r, d) => {
  if (d === 1) {
    const rho = r.pick([500, 800, 1000, 2700, 7800, 11300])
    const V = r.pick([0.01, 0.02, 0.05, 0.1, 0.2, 0.5])
    const m = round(rho * V, 3)
    return numeric({
      text: `A block has a mass of ${num(m, 3)} kg and a volume of ${num(V, 3)} m³. What is its density?`,
      value: rho,
      u: 'kg/m³',
      traps: [m * V, V / m, m / V / 10],
      formula: 'ρ = m / V',
      explanation: [`ρ = ${num(m, 3)} ÷ ${num(V, 3)} = ${num(rho)} kg/m³.`],
      expectedSeconds: 30,
    })
  }
  if (d === 2) {
    const L = r.step(500, 20000, 500)
    const dens = r.pick([0.78, 0.8, 0.82])
    return numeric({
      text: `An aircraft tank holds ${num(L)} litres of jet fuel with a density of ${num(dens)} kg/L. What is the mass of the fuel?`,
      value: round(L * dens, 1),
      u: 'kg',
      dp: 1,
      traps: [L / dens, L, L * dens * 2.2],
      formula: 'm = ρ V',
      explanation: [`m = ${num(L)} × ${num(dens)} = ${num(L * dens, 1)} kg.`],
      expectedSeconds: 35,
    })
  }
  const V = r.pick([0.002, 0.005, 0.01, 0.02, 0.05])
  const fluid = r.pick([
    ['fresh water', 1000],
    ['sea water', 1030],
    ['oil', 900],
  ] as [string, number][])
  const U = fluid[1] * 10 * V
  return numeric({
    text: `A sealed box with a volume of ${num(V, 3)} m³ is held completely under ${fluid[0]} (density ${num(fluid[1])} kg/m³). What is the upthrust on it?`,
    given: G,
    value: U,
    u: 'N',
    dp: 1,
    traps: [fluid[1] * V, U * 10, U / 2],
    formula: "upthrust = weight of fluid displaced = ρ g V (Archimedes' principle)",
    explanation: [`Mass of fluid displaced = ${num(fluid[1])} × ${num(V, 3)} = ${num(fluid[1] * V, 2)} kg.`, `Upthrust = ${num(fluid[1] * V, 2)} × 10 = ${num(U, 1)} N.`],
    expectedSeconds: 70,
  })
})

const pressureConcept = concept('pr-concept', 'pressure', {
  1: [
    { q: 'Why do snowshoes stop you sinking into soft snow?', a: 'They spread your weight over a larger area, reducing pressure', w: ['They reduce your weight', 'They increase the pressure on the snow', 'They make the snow harder'], e: 'p = F / A: the same force on a bigger area gives lower pressure.' },
    { q: 'How does air pressure change as an aircraft climbs?', a: 'It decreases', w: ['It increases', 'It stays the same', 'It increases then decreases'], e: 'There is less air above you the higher you go, so pressure falls.' },
    { q: 'An object floats in water. What does that tell you about its average density?', a: 'It is less than the density of water', w: ['It is greater than the density of water', 'It is exactly zero', 'It is equal to the density of air'], e: 'Objects less dense than the fluid float.' },
  ],
  2: [
    { q: 'How does air density change when the air temperature rises at constant pressure?', a: 'It decreases', w: ['It increases', 'It stays the same', 'It doubles'], e: 'Warm air expands, so the same mass occupies more volume — lower density.' },
    { q: 'Why does a hydraulic jack let a small force lift a heavy car?', a: 'Pressure is transmitted equally, and the larger piston has a larger area', w: ['Oil is lighter than air', 'The fluid creates extra energy', 'The small piston has a larger area'], e: 'F = p × A: the same pressure on a bigger piston gives a bigger force (over a smaller distance).' },
    { q: 'Pressure at the bottom of a tank of water depends on which of these?', a: 'The depth of the water', w: ['The width of the tank', 'The total volume of water', 'The shape of the tank'], e: 'p = ρ g h depends only on depth, density and g.' },
  ],
  3: [
    { q: 'An aircraft flies from an area of high pressure to an area of low pressure without resetting its altimeter. What happens to its true altitude while the altimeter shows a constant reading?', a: 'The aircraft is lower than indicated', w: ['The aircraft is higher than indicated', 'Nothing — the altimeter compensates', 'The aircraft is exactly at the indicated altitude'], e: '"High to low, look out below": the pressure level the altimeter follows descends towards the ground.' },
    { q: 'Why does an aircraft need a longer take-off run at a hot, high-elevation airport?', a: 'The air is less dense, so wings and engines produce less lift and thrust', w: ['The air is denser and creates more drag', 'Gravity is stronger at high elevation', 'Hot runways have more friction'], e: 'Lower air density reduces both lift (at a given speed) and engine thrust.' },
    { q: 'A ship sails from fresh water into sea water (which is denser). What happens?', a: 'It rises slightly in the water', w: ['It sinks slightly lower', 'Nothing changes', 'It must take on ballast to float'], e: 'It needs to displace less volume of the denser water to support the same weight.' },
  ],
})

/* ======================= 7. Aerodynamics ======================= */

const aeroConcept = concept('aero-concept', 'aero', {
  1: [
    { q: 'Which force opposes the forward motion of an aircraft through the air?', a: 'Drag', w: ['Lift', 'Thrust', 'Weight'], e: 'Drag acts opposite to the direction of motion through the air.' },
    { q: 'Which force does the wing mainly produce?', a: 'Lift', w: ['Thrust', 'Weight', 'Drag only'], e: 'The wing deflects air downward and generates lift perpendicular to the airflow.' },
    { q: 'What is the angle of attack?', a: 'The angle between the wing chord line and the oncoming airflow', w: ['The angle between the wing and the fuselage', 'The angle of the aircraft\'s climb path', 'The angle between the nose and the horizon'], e: 'Angle of attack is measured relative to the relative airflow, not the horizon.' },
    { q: 'An aircraft is climbing at a steady speed. Compared with level flight at the same speed, what must the engines provide?', a: 'More thrust', w: ['Less thrust', 'The same thrust', 'No thrust at all'], e: 'In a climb, part of the weight acts backwards along the flight path, so extra thrust is needed.' },
  ],
  2: [
    { q: 'What causes a wing to stall?', a: 'Exceeding the critical angle of attack', w: ['Flying below a particular airspeed regardless of angle', 'Losing engine power', 'Flying too high'], e: 'A stall happens when airflow separates from the wing at the critical angle of attack; it can occur at any speed.' },
    { q: 'What do flaps do when extended for landing?', a: 'Increase both lift and drag at a given speed', w: ['Increase lift and reduce drag', 'Reduce lift and reduce drag', 'Only reduce drag'], e: 'Flaps increase wing camber (and often area): more lift at low speed, plus more drag for a steeper approach.' },
    { q: 'Below the stall, what happens to lift if the angle of attack increases at constant airspeed?', a: 'Lift increases', w: ['Lift decreases', 'Lift stays the same', 'Lift becomes zero'], e: 'The lift coefficient rises roughly linearly with angle of attack until near the critical angle.' },
    { q: 'How does induced drag change as an aircraft flies faster in level flight?', a: 'It decreases', w: ['It increases', 'It stays constant', 'It becomes the only drag'], e: 'At higher speed less angle of attack is needed for the same lift, so wingtip vortices and induced drag reduce.' },
  ],
  3: [
    { q: 'Why does the stall speed increase in a steep turn?', a: 'The wing must produce more lift than weight, so it reaches the critical angle at a higher speed', w: ['The engine produces less thrust in a turn', 'Weight increases in a turn', 'Drag disappears in a turn'], e: 'Load factor n = 1 / cos(bank); the stall speed rises with √n.' },
    { q: 'An aircraft flying near the ground on landing floats further than expected. What is the most likely cause?', a: 'Ground effect reducing induced drag', w: ['Increased air density near the ground', 'A sudden increase in thrust', 'The flaps retracting'], e: 'Within about one wingspan of the ground, wingtip vortices are restricted, reducing induced drag.' },
    { q: 'At the same indicated airspeed, how does a heavier aircraft\'s angle of attack compare in level flight?', a: 'It must be higher', w: ['It must be lower', 'It is the same', 'It is zero'], e: 'More weight needs more lift; at the same speed that means a higher angle of attack (and a higher stall speed).' },
    { q: 'What happens to the airflow over a wing at the stall?', a: 'It separates from the upper surface, and lift drops sharply', w: ['It speeds up and lift rises sharply', 'It becomes perfectly smooth', 'It reverses direction over the whole lower surface'], e: 'Beyond the critical angle the boundary layer separates and lift falls while drag rises.' },
  ],
})

const aeroLift = tpl('aero-lift', 'aero', (r, d) => {
  if (d === 1) {
    const k = r.pick([2, 3])
    return {
      kind: 'text',
      text: `If an aircraft's airspeed is multiplied by ${k} while the angle of attack and air density stay the same, what happens to the lift?`,
      correct: `It increases ${k * k} times`,
      wrong: [`It increases ${k} times`, `It increases ${k * 2} times`, 'It stays the same', `It increases ${k ** 3} times`],
      formula: 'L = ½ ρ v² S C_L  (lift ∝ v²)',
      explanation: [`Lift is proportional to v², so the factor is ${k}² = ${k * k}.`],
      expectedSeconds: 30,
    }
  }
  if (d === 2) {
    const pairs: [number, number][] = [
      [100, 150],
      [100, 200],
      [120, 180],
      [200, 100],
      [150, 100],
      [80, 120],
    ]
    const [v1, v2] = r.pick(pairs)
    const L1 = r.step(20, 200, 10)
    const L2 = L1 * (v2 / v1) ** 2
    return numeric({
      text: `A wing produces ${num(L1)} kN of lift at ${v1} kt. At the same angle of attack and air density, how much lift does it produce at ${v2} kt?`,
      value: L2,
      u: 'kN',
      dp: 1,
      traps: [L1 * (v2 / v1), L1 * (v1 / v2) ** 2, L1 + (v2 - v1)],
      formula: 'L ∝ v²  →  L₂ = L₁ × (v₂ / v₁)²',
      explanation: [`Ratio of speeds = ${v2} ÷ ${v1} = ${num(v2 / v1, 3)}.`, `Squared = ${num((v2 / v1) ** 2, 4)}.`, `L₂ = ${num(L1)} × ${num((v2 / v1) ** 2, 4)} = ${num(L2, 1)} kN.`],
      expectedSeconds: 60,
    })
  }
  const W = r.step(50, 800, 10)
  const bank = r.pick([
    [60, 2, '1 / cos 60° = 2'],
    [45, 1.41, '1 / cos 45° ≈ 1.41'],
  ] as [number, number, string][])
  const askStall = r.chance(0.5)
  if (askStall) {
    const vs = r.step(50, 140, 2)
    const factor = bank[0] === 60 ? 1.41 : 1.19
    const given = bank[0] === 60 ? '√2 ≈ 1.41' : '√1.41 ≈ 1.19'
    return numeric({
      text: `An aircraft stalls at ${vs} kt in level flight. Approximately what is its stall speed in a level ${bank[0]}° banked turn?`,
      given: `${bank[2]};  ${given}`,
      value: round(vs * factor, 0),
      u: 'kt',
      dp: 0,
      traps: [vs * bank[1], vs, round(vs / factor, 0)],
      step: 5,
      formula: 'n = 1 / cos(bank);  V_stall,turn = V_stall × √n',
      explanation: [`Load factor n = ${bank[1]}.`, `Stall speed rises by √n ≈ ${factor}: ${vs} × ${factor} ≈ ${Math.round(vs * factor)} kt.`],
      expectedSeconds: 75,
    })
  }
  return numeric({
    text: `An aircraft weighing ${num(W)} kN makes a level turn at ${bank[0]}° of bank. How much lift must the wings produce?`,
    given: bank[2],
    value: round(W * bank[1], 1),
    u: 'kN',
    dp: 1,
    traps: [W, W * bank[1] * bank[1], W / bank[1]],
    formula: 'L = W / cos(bank)',
    explanation: [`In a level turn the vertical part of lift must still equal weight.`, `L = ${num(W)} × ${bank[1]} = ${num(W * bank[1], 1)} kN.`],
    expectedSeconds: 60,
  })
})

/* ======================= 8. Electricity ======================= */

const ohm = tpl('el-ohm', 'electricity', (r, d) => {
  if (d === 1) {
    const I = r.pick([0.5, 1, 1.5, 2, 2.5, 3, 4, 5])
    const R = r.pick([2, 4, 5, 6, 8, 10, 12, 20, 24])
    const V = I * R
    const ask = r.pick(['V', 'I', 'R'] as const)
    if (ask === 'V')
      return numeric({ text: `A current of ${num(I)} A flows through a ${R} Ω resistor. What is the voltage across it?`, value: V, u: 'V', dp: 2, traps: [R / I, I / R, I + R], step: stepFor(V, 1), formula: 'V = I R', explanation: [`V = ${num(I)} × ${R} = ${num(V)} V.`], expectedSeconds: 20 })
    if (ask === 'I')
      return numeric({ text: `A ${num(V)} V supply is connected across a ${R} Ω resistor. What current flows?`, value: I, u: 'A', dp: 2, traps: [V * R, R / V, V - R], step: stepFor(I, 0.5), formula: 'I = V / R', explanation: [`I = ${num(V)} ÷ ${R} = ${num(I)} A.`], expectedSeconds: 20 })
    return numeric({ text: `A current of ${num(I)} A flows when ${num(V)} V is applied across a component. What is its resistance?`, value: R, u: 'Ω', dp: 2, traps: [V * I, I / V, V + I], step: stepFor(R, 1), formula: 'R = V / I', explanation: [`R = ${num(V)} ÷ ${num(I)} = ${R} Ω.`], expectedSeconds: 20 })
  }
  if (d === 2) {
    const V = r.pick([6, 12, 24, 28, 115, 230])
    const I = r.pick([0.5, 2, 3, 4, 5, 10])
    const P = V * I
    const askI = r.chance(0.5)
    return numeric({
      text: askI ? `A ${num(P)} W aircraft cabin heater runs on a ${V} V supply. What current does it draw?` : `A device draws ${num(I)} A from a ${V} V supply. What power does it use?`,
      value: askI ? I : P,
      u: askI ? 'A' : 'W',
      dp: 2,
      traps: askI ? [P * V, V / P, P - V] : [V / I, I / V, V + I],
      step: askI ? stepFor(I, 0.5) : stepFor(P),
      formula: askI ? 'I = P / V' : 'P = V I',
      explanation: [askI ? `I = ${num(P)} ÷ ${V} = ${num(I)} A.` : `P = ${V} × ${num(I)} = ${num(P)} W.`],
      expectedSeconds: 35,
    })
  }
  const R1 = r.pick([2, 3, 4, 5, 6, 8, 10])
  const R2 = r.pick([2, 4, 6, 10, 12, 15, 20])
  const I = r.pick([0.5, 1, 1.5, 2])
  const V = I * (R1 + R2)
  if (!Number.isInteger(V) || R1 === R2) return null
  return numeric({
    text: `A ${num(V)} V battery is connected to a ${R1} Ω and a ${R2} Ω resistor in series. What is the voltage across the ${R2} Ω resistor?`,
    diagram: { kind: 'circuit', layout: 'series', source: `${num(V)} V`, resistors: [`${R1} Ω`, `${R2} Ω`] },
    value: I * R2,
    u: 'V',
    dp: 2,
    traps: [I * R1, V, V / 2],
    step: stepFor(I * R2, 1),
    formula: 'R_total = R₁ + R₂;  I = V / R_total;  V₂ = I R₂',
    explanation: [`Total resistance = ${R1} + ${R2} = ${R1 + R2} Ω.`, `Current = ${num(V)} ÷ ${R1 + R2} = ${num(I)} A.`, `V across ${R2} Ω = ${num(I)} × ${R2} = ${num(I * R2)} V.`],
    expectedSeconds: 70,
  })
})

const PARALLEL: [number, number, number][] = [
  [6, 3, 2],
  [12, 6, 4],
  [4, 4, 2],
  [20, 30, 12],
  [10, 15, 6],
  [12, 4, 3],
  [6, 12, 4],
  [10, 10, 5],
  [30, 60, 20],
]

const circuits = tpl('el-circuit', 'electricity', (r, d) => {
  if (d === 1) {
    const rs = [r.pick([2, 3, 4, 5, 6]), r.pick([5, 8, 10, 12]), r.pick([1, 2, 7, 15])]
    const n = r.chance(0.5) ? 2 : 3
    const used = rs.slice(0, n)
    const tot = used.reduce((a, b) => a + b, 0)
    return numeric({
      text: `What is the total resistance of ${n === 2 ? 'these two resistors' : 'these three resistors'} connected in series?`,
      diagram: { kind: 'circuit', layout: 'series', source: '', resistors: used.map((x) => `${x} Ω`) },
      value: tot,
      u: 'Ω',
      traps: [round(1 / used.reduce((a, b) => a + 1 / b, 0), 2), Math.max(...used), round(tot / n, 2)],
      step: 1,
      formula: 'R_series = R₁ + R₂ + …',
      explanation: [`${used.join(' + ')} = ${tot} Ω.`],
      expectedSeconds: 20,
    })
  }
  const [a, b, p] = r.pick(PARALLEL)
  if (d === 2)
    return numeric({
      text: `A ${a} Ω and a ${b} Ω resistor are connected in parallel. What is their combined resistance?`,
      diagram: { kind: 'circuit', layout: 'parallel', source: '', resistors: [`${a} Ω`, `${b} Ω`] },
      value: p,
      u: 'Ω',
      traps: [a + b, (a + b) / 2, Math.abs(a - b) || null],
      step: 1,
      formula: 'R = R₁R₂ / (R₁ + R₂)',
      explanation: [`(${a} × ${b}) ÷ (${a} + ${b}) = ${a * b} ÷ ${a + b} = ${p} Ω.`, `A parallel combination is always smaller than the smallest resistor.`],
      expectedSeconds: 45,
    })
  const Rs = r.pick([2, 3, 4, 6, 8])
  const I = r.pick([0.5, 1, 2])
  const V = I * (Rs + p)
  if (!Number.isInteger(V)) return null
  return numeric({
    text: `A ${num(V)} V supply feeds a ${Rs} Ω resistor in series with a parallel pair of ${a} Ω and ${b} Ω. What current flows from the supply?`,
    diagram: { kind: 'circuit', layout: 'series', source: `${num(V)} V`, resistors: [`${Rs} Ω`, `${a} Ω ∥ ${b} Ω`] },
    value: I,
    u: 'A',
    dp: 2,
    traps: [round(V / (Rs + a + b), 2), round(V / p, 2), round(V / Rs, 2)],
    step: stepFor(I, 0.25),
    formula: 'R_total = R_s + R₁R₂ / (R₁ + R₂);  I = V / R_total',
    explanation: [`Parallel pair = ${a * b} ÷ ${a + b} = ${p} Ω.`, `Total = ${Rs} + ${p} = ${Rs + p} Ω.`, `I = ${num(V)} ÷ ${Rs + p} = ${num(I)} A.`],
    expectedSeconds: 80,
  })
})

const elEnergy = tpl('el-energy', 'electricity', (r, d) => {
  if (d === 1) {
    const P = r.pick([0.5, 1, 1.5, 2, 2.5, 3])
    const h = r.int(2, 10)
    const price = r.pick([10, 20, 25, 30, 40])
    const cost = P * h * price
    return numeric({
      text: `A ${num(P)} kW heater runs for ${h} hours. Electricity costs ${price} tenge per kWh. How much does it cost to run?`,
      value: cost,
      u: 'tenge',
      traps: [P * price, h * price, P * h],
      formula: 'energy (kWh) = power (kW) × time (h)',
      explanation: [`Energy = ${num(P)} × ${h} = ${num(P * h)} kWh.`, `Cost = ${num(P * h)} × ${price} = ${num(cost)} tenge.`],
      expectedSeconds: 30,
    })
  }
  if (d === 2) {
    const P = r.pick([60, 100, 500, 1000, 1500, 2000])
    const min = r.pick([1, 2, 5, 10, 15, 30])
    const E = P * min * 60
    return numeric({
      text: `A ${num(P)} W appliance is used for ${min} minute${min === 1 ? '' : 's'}. How much energy does it transfer?`,
      value: E / 1000,
      u: 'kJ',
      traps: [(P * min) / 1000, (P * min * 60) / 1e6, (P / min) * 60 / 1000],
      formula: 'E = P t  (t in seconds)',
      explanation: [`t = ${min} × 60 = ${min * 60} s.`, `E = ${num(P)} × ${min * 60} = ${num(E)} J = ${num(E / 1000)} kJ.`],
      expectedSeconds: 40,
    })
  }
  const I = r.pick([0.5, 1, 2, 4, 5])
  const min = r.pick([2, 5, 10, 20, 30])
  const V = r.pick([6, 12, 24, 28])
  const Q = I * min * 60
  return numeric({
    text: `A ${V} V battery delivers a steady ${num(I)} A for ${min} minutes. How much energy does it transfer?`,
    value: (Q * V) / 1000,
    u: 'kJ',
    traps: [Q / 1000, (I * min * V) / 1000, (Q * V) / 60 / 1000],
    formula: 'Q = I t;  E = Q V',
    explanation: [`Charge Q = ${num(I)} × ${min * 60} s = ${num(Q)} C.`, `Energy = ${num(Q)} × ${V} = ${num(Q * V)} J = ${num((Q * V) / 1000)} kJ.`],
    expectedSeconds: 70,
  })
})

const elConcept = concept('el-concept', 'electricity', {
  1: [
    { q: 'How must an ammeter be connected to measure the current through a lamp?', a: 'In series with the lamp', w: ['In parallel with the lamp', 'Across the battery only', 'It does not matter'], e: 'Current must flow through the ammeter, so it goes in series.' },
    { q: 'How must a voltmeter be connected to measure the voltage across a lamp?', a: 'In parallel with the lamp', w: ['In series with the lamp', 'In series with the battery', 'Anywhere in the circuit'], e: 'A voltmeter compares two points, so it connects across the component.' },
    { q: 'What is the unit of electrical resistance?', a: 'Ohm (Ω)', w: ['Ampere (A)', 'Volt (V)', 'Watt (W)'], e: 'Resistance is measured in ohms.' },
  ],
  2: [
    { q: 'Two lamps are connected in parallel. One lamp breaks. What happens to the other?', a: 'It stays lit', w: ['It goes out', 'It gets dimmer', 'It flashes on and off'], e: 'Each parallel branch has its own complete path to the supply.' },
    { q: 'Two lamps are connected in series. One lamp breaks. What happens to the other?', a: 'It goes out', w: ['It stays lit at the same brightness', 'It becomes brighter', 'It becomes dimmer but stays lit'], e: 'A series circuit has only one path; a break stops all current.' },
    { q: 'What happens to the resistance of a metal wire if it is made longer (same material and thickness)?', a: 'It increases', w: ['It decreases', 'It stays the same', 'It becomes zero'], e: 'Resistance is proportional to length.' },
  ],
  3: [
    { q: 'A third resistor is added in parallel to two existing parallel resistors. What happens to the total current from the supply?', a: 'It increases', w: ['It decreases', 'It stays the same', 'It falls to zero'], e: 'Adding a parallel path lowers total resistance, so the supply delivers more current.' },
    { q: 'What is the purpose of a fuse or circuit breaker?', a: 'To break the circuit if the current becomes too large', w: ['To increase the voltage', 'To store charge', 'To keep the current constant'], e: 'It protects wiring from overheating by cutting excessive current.' },
    { q: 'Two identical resistors are connected in series to a battery. How does the voltage across each compare with the battery voltage?', a: 'Each gets half the battery voltage', w: ['Each gets the full battery voltage', 'Each gets twice the battery voltage', 'One gets all of it, the other none'], e: 'In series the supply voltage is shared in proportion to resistance; equal resistors share it equally.' },
  ],
})

/* ======================= 9. Heat & thermodynamics ======================= */

const heatShc = tpl('ht-shc', 'heat', (r, d) => {
  const m = r.pick([0.5, 1, 2, 2.5, 4, 5])
  const dT = r.step(5, 80, 5)
  const c = 4200
  const Q = m * c * dT
  if (d === 1)
    return numeric({
      text: `How much energy is needed to heat ${num(m)} kg of water by ${dT} °C?`,
      given: 'Specific heat capacity of water = 4,200 J/(kg °C)',
      value: Q / 1000,
      u: 'kJ',
      dp: 1,
      traps: [(c * dT) / 1000, (m * c) / 1000, (m * dT * 420) / 1000],
      formula: 'Q = m c ΔT',
      explanation: [`Q = ${num(m)} × 4,200 × ${dT} = ${num(Q)} J = ${num(Q / 1000, 1)} kJ.`],
      expectedSeconds: 35,
    })
  if (d === 2)
    return numeric({
      text: `${num(Q / 1000, 1)} kJ of energy is supplied to ${num(m)} kg of water. By how much does its temperature rise?`,
      given: 'Specific heat capacity of water = 4,200 J/(kg °C)',
      value: dT,
      u: '°C',
      dp: 1,
      traps: [round(Q / c, 1), round(Q / (m * 1000), 1), dT * 2],
      step: 5,
      formula: 'ΔT = Q / (m c)',
      explanation: [`ΔT = ${num(Q)} ÷ (${num(m)} × 4,200) = ${dT} °C.`],
      expectedSeconds: 50,
    })
  const P = r.pick([500, 1000, 1500, 2000, 3000])
  const t = Q / P
  if (!Number.isInteger(t)) return null
  return numeric({
    text: `A ${num(P)} W heater warms ${num(m)} kg of water by ${dT} °C. Assuming no heat losses, how long does it take?`,
    given: 'Specific heat capacity of water = 4,200 J/(kg °C)',
    value: t,
    u: 's',
    dp: 0,
    traps: [Q / P / 60, (P * dT) / m / 100, (m * dT * P) / 4200],
    formula: 't = m c ΔT / P',
    explanation: [`Energy = ${num(m)} × 4,200 × ${dT} = ${num(Q)} J.`, `t = ${num(Q)} ÷ ${num(P)} = ${num(t)} s.`],
    expectedSeconds: 75,
  })
})

const heatGas = tpl('ht-gas', 'heat', (r, d) => {
  if (d === 1) {
    const C = r.step(-50, 150, 5)
    const toK = r.chance(0.6)
    return numeric({
      text: toK ? `Convert ${num(C)} °C to kelvin.` : `Convert ${num(C + 273)} K to degrees Celsius.`,
      given: 'K = °C + 273',
      value: toK ? C + 273 : C,
      u: toK ? 'K' : '°C',
      dp: 0,
      min: -300,
      traps: toK ? [C + 373, 273 - C, C + 263] : [C + 546, C + 273, C + 100],
      step: 10,
      formula: 'T(K) = T(°C) + 273',
      explanation: [toK ? `${num(C)} + 273 = ${num(C + 273)} K.` : `${num(C + 273)} − 273 = ${num(C)} °C.`],
      expectedSeconds: 20,
    })
  }
  if (d === 2) {
    const p1 = r.pick([100, 120, 150, 200])
    const V1 = r.pick([2, 3, 4, 6, 8, 12])
    const k = r.pick([2, 3, 4, 0.5])
    const V2 = V1 / k
    if (!Number.isInteger(V2 * 10)) return null
    return numeric({
      text: `A gas at ${p1} kPa occupies ${V1} L. It is ${k > 1 ? 'compressed' : 'allowed to expand'} to ${num(V2)} L at constant temperature. What is its new pressure?`,
      value: p1 * k,
      u: 'kPa',
      dp: 1,
      traps: [p1 / k, p1 * V1 * V2, p1 + (V1 - V2)],
      formula: 'p₁V₁ = p₂V₂ (Boyle\'s law)',
      explanation: [`p₂ = p₁V₁ ÷ V₂ = ${p1} × ${V1} ÷ ${num(V2)} = ${num(p1 * k)} kPa.`],
      expectedSeconds: 50,
    })
  }
  for (let i = 0; i < 40; i++) {
    const T1c = r.pick([-3, 27, 57]) // 270, 300, 330 K
    const T2c = r.pick([-3, 27, 57, 87, 117, 147])
    const T1 = T1c + 273
    const T2 = T2c + 273
    const V1 = r.pick([2, 3, 4, 5, 6, 9, 10])
    const V2 = (V1 * T2) / T1
    if (T1 === T2 || !Number.isInteger(V2 * 10)) continue
    return numeric({
      text: `A balloon holds ${V1} L of gas at ${num(T1c)} °C. At constant pressure, what is its volume at ${num(T2c)} °C?`,
      given: 'K = °C + 273',
      value: V2,
      u: 'L',
      dp: 2,
      traps: [T1c !== 0 ? round((V1 * T2c) / T1c, 2) : null, round((V1 * T1) / T2, 2), V1],
      step: stepFor(V2, 0.5),
      formula: 'V₁ / T₁ = V₂ / T₂  (T in kelvin)',
      explanation: [`T₁ = ${T1} K, T₂ = ${T2} K.`, `V₂ = ${V1} × ${T2} ÷ ${T1} = ${num(V2, 2)} L. Using °C directly gives the wrong answer because the Celsius zero is arbitrary.`],
      expectedSeconds: 80,
    })
  }
  return null
})

const heatIsa = tpl('ht-isa', 'heat', (r, d) => {
  const given = 'ISA: 15 °C at sea level, falling 2 °C per 1,000 ft'
  if (d === 1) {
    const alt = r.step(1000, 20000, 1000)
    const T = 15 - (2 * alt) / 1000
    return numeric({
      text: `What is the ISA temperature at ${num(alt)} ft?`,
      given,
      value: T,
      u: '°C',
      dp: 0,
      min: -100,
      traps: [15 + (2 * alt) / 1000, -(2 * alt) / 1000, 15 - alt / 1000],
      step: 2,
      formula: 'T = 15 − 2 × (altitude ÷ 1,000 ft)',
      explanation: [`Drop = 2 × ${alt / 1000} = ${(2 * alt) / 1000} °C.`, `15 − ${(2 * alt) / 1000} = ${num(T)} °C.`],
      expectedSeconds: 30,
    })
  }
  if (d === 2) {
    const alt = r.step(2000, 36000, 1000)
    const isa = 15 - (2 * alt) / 1000
    const dev = r.int(-15, 15)
    if (dev === 0) return null
    const oat = isa + dev
    return numeric({
      text: `At ${num(alt)} ft the outside air temperature is ${num(oat)} °C. What is the ISA deviation?`,
      given,
      value: dev,
      u: '°C',
      dp: 0,
      min: -100,
      traps: [-dev, oat - 15, oat + (2 * alt) / 1000],
      step: 2,
      formula: 'ISA deviation = actual temperature − ISA temperature',
      explanation: [`ISA at ${num(alt)} ft = ${num(isa)} °C.`, `Deviation = ${num(oat)} − (${num(isa)}) = ${dev > 0 ? '+' : ''}${num(dev)} °C (ISA ${dev > 0 ? '+' : '−'}${Math.abs(dev)}).`],
      expectedSeconds: 50,
    })
  }
  const elev = r.step(0, 4000, 500)
  const surf = r.int(4, 22)
  const fl = elev + (surf / 2) * 1000
  return numeric({
    text: `An airfield at ${num(elev)} ft elevation reports ${surf} °C. Assuming the temperature falls 2 °C per 1,000 ft, at what altitude above mean sea level is the freezing level?`,
    value: fl,
    u: 'ft',
    dp: 0,
    traps: [(surf / 2) * 1000, elev + surf * 1000, (surf / 2) * 1000 - elev > 0 ? (surf / 2) * 1000 - elev : null],
    step: 500,
    formula: 'height above airfield = surface temperature ÷ lapse rate',
    explanation: [`It must cool ${surf} °C to reach 0 °C: ${surf} ÷ 2 × 1,000 = ${num((surf / 2) * 1000)} ft above the field.`, `Add the elevation: ${num(elev)} + ${num((surf / 2) * 1000)} = ${num(fl)} ft.`],
    expectedSeconds: 70,
  })
})

const heatConcept = concept('ht-concept', 'heat', {
  1: [
    { q: 'How is heat mainly transferred through a solid metal bar?', a: 'Conduction', w: ['Convection', 'Radiation only', 'Evaporation'], e: 'Vibrating particles and free electrons pass energy along the solid.' },
    { q: 'How does the Sun\'s energy reach the Earth through space?', a: 'Radiation', w: ['Conduction', 'Convection', 'Sound waves'], e: 'Space is a vacuum, so only electromagnetic radiation can carry the energy.' },
    { q: 'In which direction does heat flow between two objects in contact?', a: 'From the hotter object to the colder one', w: ['From the colder object to the hotter one', 'From the larger object to the smaller one', 'It does not flow without a pump'], e: 'Thermal energy flows from higher to lower temperature until they are equal.' },
  ],
  2: [
    { q: 'Ice is heated steadily and melts. What happens to its temperature while it is melting?', a: 'It stays at 0 °C until all the ice has melted', w: ['It rises steadily', 'It falls below 0 °C', 'It jumps to 100 °C'], e: 'The energy supplied breaks bonds (latent heat) instead of raising temperature.' },
    { q: 'Why do you feel cold when you step out of a swimming pool on a windy day?', a: 'Evaporating water takes energy from your skin', w: ['Water conducts heat into your body', 'Wind adds energy to the water', 'Your skin radiates less heat when wet'], e: 'Evaporation removes the fastest-moving molecules, cooling the remaining water and your skin.' },
    { q: 'Why does warm air rise in a room?', a: 'It expands and becomes less dense', w: ['It becomes heavier', 'Its particles get smaller', 'Heat itself weighs less than cold'], e: 'Less dense fluid rises — this sets up a convection current.' },
  ],
  3: [
    { q: 'A sealed gas cylinder is heated. Which statement is correct?', a: 'The pressure rises because particles hit the walls faster and more often', w: ['The pressure falls because particles spread out', 'The volume of the cylinder doubles', 'The number of particles increases'], e: 'At fixed volume, higher temperature means faster particles and more forceful, more frequent collisions.' },
    { q: 'Why does air cool as it rises in the atmosphere, even without losing heat to its surroundings?', a: 'It expands as pressure falls, and does work on the surrounding air', w: ['It moves closer to space, which is cold', 'It loses mass as it rises', 'It radiates all its heat away instantly'], e: 'Adiabatic expansion: the rising air expands and its internal energy decreases.' },
    { q: 'Which substance needs the most energy to raise its temperature by 1 °C per kilogram?', a: 'The one with the highest specific heat capacity', w: ['The one with the highest density', 'The one with the lowest melting point', 'The one with the most mass'], e: 'Specific heat capacity is defined per kilogram per degree.' },
  ],
})

/* ======================= 10. Waves, sound, light ======================= */

const waveSpeed = tpl('wv-speed', 'waves', (r, d) => {
  if (d === 1) {
    const f = r.pick([2, 5, 10, 20, 50, 100, 200, 500])
    const lam = r.pick([0.5, 1, 1.5, 2, 3, 4])
    return numeric({
      text: `A wave has a frequency of ${f} Hz and a wavelength of ${num(lam)} m. What is its speed?`,
      value: f * lam,
      u: 'm/s',
      traps: [f / lam, lam / f, f + lam],
      formula: 'v = f λ',
      explanation: [`v = ${f} × ${num(lam)} = ${num(f * lam)} m/s.`],
      expectedSeconds: 20,
    })
  }
  if (d === 2) {
    if (r.chance(0.5)) {
      const span = r.pick([3, 4, 6, 8, 9, 12])
      const cycles = r.pick([2, 3, 4])
      const lam = span / cycles
      const f = r.pick([5, 10, 20, 50])
      if (!Number.isInteger(lam * 100)) return null
      return numeric({
        text: `The diagram shows a wave with a frequency of ${f} Hz. What is the wave speed?`,
        diagram: { kind: 'wave', cycles, spanLabel: `${num(span)} m` },
        value: f * lam,
        u: 'm/s',
        traps: [f * span, (f * span) / (cycles * 2), f * lam * 2],
        formula: 'λ = span ÷ number of complete waves;  v = f λ',
        explanation: [`${cycles} complete waves fit in ${span} m, so λ = ${num(lam)} m.`, `v = ${f} × ${num(lam)} = ${num(f * lam)} m/s.`],
        expectedSeconds: 50,
      })
    }
    const v = 340
    const f = r.pick([170, 340, 680, 850, 1700])
    return numeric({
      text: `A sound wave has a frequency of ${num(f)} Hz in air. What is its wavelength?`,
      given: 'Speed of sound in air = 340 m/s',
      value: v / f,
      u: 'm',
      dp: 2,
      traps: [f / v, v * f, (v / f) * 10],
      step: stepFor(v / f, 0.05),
      formula: 'λ = v / f',
      explanation: [`λ = 340 ÷ ${num(f)} = ${num(v / f)} m.`],
      expectedSeconds: 40,
    })
  }
  const echo = r.chance(0.5)
  const t = r.pick([0.5, 1, 1.5, 2, 3, 4, 5, 6])
  return echo
    ? numeric({
        text: `A ship sends a sound pulse to the sea floor and hears the echo ${num(t)} s later. How deep is the water?`,
        given: 'Speed of sound in sea water = 1,500 m/s',
        value: (1500 * t) / 2,
        u: 'm',
        traps: [1500 * t, 1500 / t, (340 * t) / 2],
        formula: 'depth = speed × time ÷ 2',
        explanation: [`The pulse travels down and back: total ${num(1500 * t)} m.`, `Depth = ${num(1500 * t)} ÷ 2 = ${num((1500 * t) / 2)} m.`],
        expectedSeconds: 50,
      })
    : numeric({
        text: `A pilot sees lightning and hears the thunder ${num(t)} s later. How far away was the lightning strike?`,
        given: 'Speed of sound in air = 340 m/s; light arrives almost instantly',
        value: 340 * t,
        u: 'm',
        traps: [(340 * t) / 2, 340 / t, 1500 * t],
        formula: 'distance = speed of sound × delay',
        explanation: [`The light arrives effectively at once, so the delay is the sound's travel time.`, `340 × ${num(t)} = ${num(340 * t)} m.`],
        expectedSeconds: 45,
      })
})

const waveConcept = concept('wv-concept', 'waves', {
  1: [
    { q: 'Which statement about sound is correct?', a: 'Sound cannot travel through a vacuum', w: ['Sound travels fastest in a vacuum', 'Sound travels faster than light', 'Sound is an electromagnetic wave'], e: 'Sound is a vibration of particles, so it needs a medium.' },
    { q: 'What do we hear when the frequency of a sound increases?', a: 'A higher pitch', w: ['A louder sound', 'A quieter sound', 'A lower pitch'], e: 'Pitch depends on frequency; loudness depends on amplitude.' },
    { q: 'Which travels fastest?', a: 'Light', w: ['Sound in air', 'Sound in water', 'Sound in steel'], e: 'Light travels at about 300,000 km/s; sound in steel at about 6 km/s.' },
  ],
  2: [
    { q: 'What happens to the frequency of a wave when it moves from air into water?', a: 'It stays the same', w: ['It increases', 'It decreases', 'It becomes zero'], e: 'Frequency is set by the source; speed and wavelength change at the boundary.' },
    { q: 'Light bends as it passes from air into glass. What is this called?', a: 'Refraction', w: ['Reflection', 'Diffraction', 'Absorption'], e: 'Refraction is the change of direction caused by a change in wave speed.' },
    { q: 'Which type of wave is sound in air?', a: 'Longitudinal', w: ['Transverse', 'Electromagnetic', 'Stationary only'], e: 'Air particles vibrate back and forth along the direction the wave travels.' },
  ],
  3: [
    { q: 'An ambulance siren sounds higher-pitched as it approaches you. Why?', a: 'The waves are compressed in front of the moving source, raising the observed frequency', w: ['The siren is switched to a higher setting', 'Sound travels faster when the source moves towards you', 'The air becomes denser in front of the ambulance'], e: 'This is the Doppler effect; the source frequency itself does not change.' },
    { q: 'Why does a radio signal from a distant transmitter reach you even when a hill is in the way, especially at long wavelengths?', a: 'Diffraction bends waves around obstacles, most strongly when the wavelength is large', w: ['Radio waves pass through rock unchanged', 'The hill reflects them back towards the transmitter', 'Long waves travel faster than short waves'], e: 'Diffraction is significant when the wavelength is similar to or larger than the obstacle.' },
    { q: 'If the amplitude of a sound wave is doubled at the same frequency, what changes?', a: 'It becomes louder; the pitch stays the same', w: ['It becomes higher-pitched', 'It travels twice as fast', 'Its wavelength doubles'], e: 'Amplitude affects loudness (energy), not frequency, speed or wavelength.' },
  ],
})

/* ======================= 11. Levers, pulleys, torque ======================= */

const moments = tpl('mc-moments', 'machines', (r, d) => {
  if (d === 1) {
    const F = r.step(10, 500, 10)
    const dd = r.pick([0.2, 0.25, 0.3, 0.4, 0.5, 0.8, 1, 1.5, 2])
    return numeric({
      text: `A force of ${num(F)} N is applied at right angles to a spanner, ${num(dd)} m from the bolt. What is the moment (torque)?`,
      value: F * dd,
      u: 'N m',
      traps: [F / dd, F + dd, (F * dd) / 2],
      formula: 'moment = F × perpendicular distance',
      explanation: [`${num(F)} × ${num(dd)} = ${num(F * dd)} N m.`],
      expectedSeconds: 20,
    })
  }
  const L = r.pick([4, 5, 6, 8, 10])
  if (d === 2) {
    for (let i = 0; i < 40; i++) {
      const pivot = r.int(1, L - 1)
      const d1 = pivot
      const d2 = L - pivot
      const W1 = r.step(50, 600, 50)
      const W2 = (W1 * d1) / d2
      if (!Number.isInteger(W2) || d1 === d2) continue
      return numeric({
        text: `A uniform beam ${L} m long is balanced on a pivot ${d1} m from its left end. A ${num(W1)} N load hangs at the left end. What downward force at the right end keeps the beam level?`,
        diagram: { kind: 'lever', length: L, pivot, loads: [{ at: 0, label: `${num(W1)} N`, dir: 'down' }, { at: L, label: '?', dir: 'down' }], marks: [{ from: 0, to: pivot, label: `${d1} m` }, { from: pivot, to: L, label: `${d2} m` }] },
        given: 'Ignore the weight of the beam',
        value: W2,
        u: 'N',
        traps: [(W1 * d2) / d1, W1, W1 * d1 * d2],
        formula: 'clockwise moments = anticlockwise moments',
        explanation: [`Anticlockwise moment = ${num(W1)} × ${d1} = ${num(W1 * d1)} N m.`, `F × ${d2} = ${num(W1 * d1)}  →  F = ${num(W2)} N.`],
        expectedSeconds: 50,
      })
    }
    return null
  }
  for (let i = 0; i < 60; i++) {
    const pivot = L / 2
    const a = r.int(1, Math.floor(pivot))
    const b = r.int(1, Math.floor(pivot))
    const W1 = r.step(100, 600, 50)
    const W2 = r.step(100, 600, 50)
    const W3 = r.step(200, 1200, 100)
    const x = (W1 * a + W2 * b) / W3
    if (a === b || x > pivot || !Number.isInteger(x * 4)) continue
    return numeric({
      text: `A ${L} m see-saw is pivoted at its centre. On the left, ${num(W1)} N sits ${a} m from the pivot and ${num(W2)} N sits ${b} m from the pivot. How far from the pivot on the right must ${num(W3)} N sit to balance it?`,
      diagram: {
        kind: 'lever',
        length: L,
        pivot,
        loads: [
          { at: pivot - a, label: `${num(W1)} N`, dir: 'down' },
          { at: pivot - b, label: `${num(W2)} N`, dir: 'down' },
          { at: pivot + x, label: `${num(W3)} N`, dir: 'down' },
        ],
        marks: [
          { from: pivot - Math.max(a, b), to: pivot, label: `${Math.max(a, b)} m` },
          { from: pivot, to: pivot + x, label: '?' },
        ],
      },
      given: 'Ignore the weight of the see-saw',
      value: x,
      u: 'm',
      dp: 2,
      traps: [round((W1 + W2) / W3, 2), round((W1 * b + W2 * a) / W3, 2) === x ? null : round((W1 * b + W2 * a) / W3, 2), round((W1 * a + W2 * b) / (W1 + W2), 2)],
      step: 0.25,
      formula: 'Σ anticlockwise moments = Σ clockwise moments',
      explanation: [`Left moments = ${num(W1)} × ${a} + ${num(W2)} × ${b} = ${num(W1 * a + W2 * b)} N m.`, `${num(W3)} × x = ${num(W1 * a + W2 * b)}  →  x = ${num(x, 2)} m.`],
      expectedSeconds: 80,
    })
  }
  return null
})

const pulleys = tpl('mc-pulley', 'machines', (r, d) => {
  const n = r.pick([2, 3, 4, 6])
  const load = r.step(200, 2400, 120)
  const diagram: Diagram = { kind: 'pulley', strands: n, load: `${num(load)} N`, effort: d === 1 ? '?' : 'Effort' }
  if (d === 1)
    return numeric({
      text: `An ideal pulley system has ${n} supporting rope sections. What effort is needed to lift a ${num(load)} N load?`,
      diagram,
      given: 'Ignore friction and the mass of the pulleys',
      value: load / n,
      u: 'N',
      traps: [load * n, load, load / (n + 1)],
      formula: 'effort = load ÷ number of supporting ropes',
      explanation: [`Mechanical advantage = ${n}.`, `${num(load)} ÷ ${n} = ${num(load / n)} N.`],
      expectedSeconds: 30,
    })
  if (d === 2) {
    const h = r.pick([0.5, 1, 1.5, 2, 3, 4])
    return numeric({
      text: `Using an ideal pulley system with ${n} supporting rope sections, a load is raised by ${num(h)} m. How much rope must be pulled through?`,
      diagram,
      value: h * n,
      u: 'm',
      traps: [h / n, h, h * (n + 1)],
      step: stepFor(h * n, 0.5),
      formula: 'distance moved by effort = number of ropes × distance moved by load',
      explanation: [`Each supporting section shortens by ${num(h)} m: ${n} × ${num(h)} = ${num(h * n)} m.`, 'The force is reduced, but the work (force × distance) stays the same.'],
      expectedSeconds: 40,
    })
  }
  const eff = r.pick([50, 60, 75, 80])
  const effort = (load / n) * (100 / eff)
  if (!Number.isInteger(effort)) return null
  return numeric({
    text: `A pulley system with ${n} supporting rope sections needs an effort of ${num(effort)} N to lift a ${num(load)} N load. What is its efficiency?`,
    diagram: { ...diagram, effort: `${num(effort)} N` },
    value: eff,
    u: '%',
    dp: 1,
    traps: [eff * n <= 100 ? eff * n : null, round((load / (effort * (n + 1))) * 100, 1), n > 2 ? round((load / (effort * (n - 1))) * 100, 1) : null].filter((x) => x == null || x <= 100),
    step: 5,
    formula: 'efficiency = (load × load distance) ÷ (effort × effort distance) × 100%',
    explanation: [`Ideal effort would be ${num(load)} ÷ ${n} = ${num(load / n)} N.`, `Efficiency = ${num(load)} ÷ (${num(effort)} × ${n}) × 100 = ${eff}%.`],
    expectedSeconds: 75,
  })
})

const machineConcept = concept('mc-concept', 'machines', {
  1: [
    { q: 'Why is it easier to open a door by pushing far from the hinge?', a: 'The larger distance gives a larger turning moment for the same force', w: ['The door is lighter there', 'Friction is lower far from the hinge', 'The hinge pushes back less'], e: 'Moment = force × distance from the pivot.' },
    { q: 'What is the pivot of a lever also called?', a: 'The fulcrum', w: ['The effort', 'The load', 'The moment'], e: 'A lever turns about its fulcrum.' },
    { q: 'A see-saw is balanced. What can you say about the moments on each side?', a: 'They are equal', w: ['The heavier side has a larger moment', 'They are both zero', 'The lighter side has a larger moment'], e: 'In equilibrium, clockwise moments equal anticlockwise moments.' },
  ],
  2: [
    { q: 'A simple machine lets you lift a load with half the force. What is the trade-off?', a: 'You must move the effort twice as far', w: ['The load becomes lighter', 'It needs twice as much energy', 'There is no trade-off'], e: 'Ideal work in = work out, so halving the force doubles the distance.' },
    { q: 'A small gear drives a larger gear. What happens to the output compared with the input?', a: 'It turns more slowly but with more turning force', w: ['It turns faster with more turning force', 'It turns faster with less turning force', 'It turns at the same speed'], e: 'A larger driven gear trades speed for torque.' },
    { q: 'Wheelbarrows, nutcrackers and bottle openers have the load between the fulcrum and the effort. Why is this useful?', a: 'The effort is further from the fulcrum than the load, so less force is needed', w: ['The load moves further than the effort', 'It removes the need for a fulcrum', 'It increases the work done'], e: 'A longer effort arm gives a mechanical advantage greater than 1.' },
  ],
  3: [
    { q: 'Why is the efficiency of a real pulley system always below 100%?', a: 'Some work is done against friction and lifting the moving pulleys', w: ['The rope stretches energy into existence', 'Gravity is weaker on pulleys', 'Mechanical advantage is always 1'], e: 'Extra effort is needed for friction and the weight of the lower pulley block.' },
    { q: 'A uniform beam rests on a pivot at its centre with no loads. Where does its own weight act?', a: 'At its centre, so it produces no moment about the pivot', w: ['At both ends equally, producing a large moment', 'At the left end', 'Nowhere — beams have no weight'], e: 'The weight of a uniform beam acts at its centre of mass.' },
    { q: 'Moving a heavy cargo item further aft in an aircraft (same total weight) does what?', a: 'Moves the centre of gravity aft', w: ['Moves the centre of gravity forward', 'Changes the aircraft\'s total weight', 'Has no effect on balance'], e: 'The centre of gravity is the point where total moment ÷ total weight acts; aft moments increase.' },
  ],
})

/* ======================= 12. Particle diagrams & physical reasoning ======================= */

const STATES = ['solid', 'liquid', 'gas'] as const

const particleDiagram = tpl('pa-diagram', 'particles', (r, d) => {
  const order = r.shuffle([...STATES])
  const boxes = order.map((state, i) => ({ label: 'XYZ'[i], state }))
  const qs = by(d, [
    { q: 'Which box shows a gas?', state: 'gas', why: 'Gas particles are far apart and randomly arranged.' },
    { q: 'Which box shows a solid?', state: 'solid', why: 'Solid particles are close together in a regular pattern.' },
  ], [
    { q: 'In which box do the particles only vibrate about fixed positions?', state: 'solid', why: 'Particles in a solid are held in place and can only vibrate.' },
    { q: 'Which box shows a substance that has a fixed volume but takes the shape of its container?', state: 'liquid', why: 'Liquid particles are close together (fixed volume) but can slide past each other.' },
  ], [
    { q: 'Which box shows the substance that is easiest to compress?', state: 'gas', why: 'Only a gas has large spaces between its particles.' },
    { q: 'All three boxes contain the same substance. Which box has the lowest density?', state: 'gas', why: 'The same particles spread over a much larger volume give the lowest density.' },
    { q: 'All three boxes contain the same substance. In which box is the substance at the highest temperature?', state: 'gas', why: 'For one substance, the gas phase exists at the highest temperature.' },
  ])
  const item = r.pick(qs)
  const correct = `Box ${'XYZ'[order.indexOf(item.state as (typeof STATES)[number])]}`
  return {
    kind: 'text',
    text: item.q,
    diagram: { kind: 'particles', boxes },
    correct,
    wrong: [],
    fixedOrder: ['Box X', 'Box Y', 'Box Z', 'None of the boxes'],
    explanation: [item.why, `That is ${correct}.`],
    expectedSeconds: by(d, 20, 30, 40),
  }
})

const particleConcept = concept('pa-concept', 'particles', {
  1: [
    { q: 'What happens to the particles in a gas when the gas is heated?', a: 'They move faster', w: ['They get bigger', 'They stop moving', 'They turn into a different substance'], e: 'Temperature is a measure of the average kinetic energy of the particles.' },
    { q: 'A drop of ink spreads through still water on its own. What is this called?', a: 'Diffusion', w: ['Condensation', 'Conduction', 'Evaporation'], e: 'Random particle motion spreads particles from high to low concentration.' },
    { q: 'What is the change of state from gas to liquid called?', a: 'Condensation', w: ['Evaporation', 'Melting', 'Sublimation'], e: 'Cooling a gas lets particles come together as a liquid.' },
  ],
  2: [
    { q: 'Why does a gas exert pressure on the walls of its container?', a: 'Particles collide with the walls and exert forces on them', w: ['The particles are attracted to the walls', 'The walls push on the gas', 'Gas particles are heavier than air'], e: 'Each collision exerts a small force; billions per second add up to pressure.' },
    { q: 'Diffusion happens faster in hot water than in cold water. Why?', a: 'The particles move faster at higher temperature', w: ['Hot water is denser', 'Hot water has fewer particles', 'Cold water particles do not move'], e: 'Faster particles spread out more quickly.' },
    { q: 'What happens to the mass of a substance when it melts?', a: 'It stays the same', w: ['It increases', 'It decreases', 'It becomes zero'], e: 'Changes of state rearrange particles; none are created or destroyed.' },
  ],
  3: [
    { q: 'Tiny smoke particles seen under a microscope move in a random, jerky way. What causes this?', a: 'Collisions with fast-moving, invisible air molecules', w: ['Convection currents in the smoke', 'The smoke particles are alive', 'Light pushing the particles'], e: 'This is Brownian motion: evidence that air is made of moving molecules.' },
    { q: 'A gas is compressed into half the volume at constant temperature. Why does its pressure double?', a: 'Particles hit each area of wall twice as often', w: ['Each particle moves twice as fast', 'The particles double in size', 'The number of particles doubles'], e: 'The same particles at the same speed are packed twice as densely, so collision rate per area doubles.' },
    { q: 'Why does a liquid cool down when some of it evaporates?', a: 'The most energetic particles escape, lowering the average energy of those left', w: ['The liquid loses mass and therefore heat', 'Air pushes heat into the liquid', 'Evaporation adds cold particles'], e: 'Lower average kinetic energy means a lower temperature.' },
  ],
})

export const PHYSICS_TEMPLATES: Template[] = [
  newtonConcept,
  newtonNet,
  forceWeight,
  forceFma,
  motionAccel,
  motionGraph,
  motionConcept,
  energyWork,
  energyKinetic,
  energyConcept,
  momentumCalc,
  momentumConcept,
  pressureCalc,
  densityCalc,
  pressureConcept,
  aeroConcept,
  aeroLift,
  ohm,
  circuits,
  elEnergy,
  elConcept,
  heatShc,
  heatGas,
  heatIsa,
  heatConcept,
  waveSpeed,
  waveConcept,
  moments,
  pulleys,
  machineConcept,
  particleDiagram,
  particleConcept,
]
