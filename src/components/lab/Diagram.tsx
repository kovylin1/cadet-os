import type { ReactNode } from 'react'
import type { Diagram as D, Dir } from '../../lab/types'
import { createRng } from '../../lab/rng'
import { CHART } from '../charts/theme'

/*
 * Every diagram is drawn from the question's own data, so labels and values
 * always match the numbers in the question. Each has a text alternative.
 */

const INK = CHART.ink
const MUTED = CHART.muted
const LINE = '#7f9bb8'
const ACCENT = CHART.accent
const font = { fontFamily: 'JetBrains Mono Variable, ui-monospace, monospace', fontSize: 13 }

function Frame({ label, viewBox, children, maxWidth = 460 }: { label: string; viewBox: string; children: ReactNode; maxWidth?: number }) {
  return (
    <figure className="m-0 rounded-control border border-hairline bg-well p-3">
      <svg viewBox={viewBox} role="img" aria-label={label} className="mx-auto block h-auto w-full" style={{ maxWidth }}>
        <defs>
          <marker id="arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
            <path d="M0 0 L10 5 L0 10 z" fill={ACCENT} />
          </marker>
          <marker id="dim" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
            <path d="M0 0 L10 5 L0 10 z" fill={MUTED} />
          </marker>
        </defs>
        {children}
      </svg>
    </figure>
  )
}

export function Diagram({ data }: { data: D }) {
  switch (data.kind) {
    case 'forces':
      return <Forces data={data} />
    case 'lever':
      return <Lever data={data} />
    case 'pulley':
      return <Pulley data={data} />
    case 'circuit':
      return <Circuit data={data} />
    case 'graph':
      return <Graph data={data} />
    case 'bars':
      return <Bars data={data} />
    case 'table':
      return <Table data={data} />
    case 'triangle':
      return <Triangle data={data} />
    case 'particles':
      return <Particles data={data} />
    case 'wave':
      return <Wave data={data} />
  }
}

/* ---------- forces ---------- */

function Forces({ data }: { data: Extract<D, { kind: 'forces' }> }) {
  const cx = 220
  const cy = 120
  const tip: Record<Dir, [number, number, number, number, number, number, 'start' | 'middle' | 'end']> = {
    // x1, y1 (body edge), x2, y2 (tip), label x, label y, anchor
    up: [cx, cy - 32, cx, cy - 95, cx, cy - 103, 'middle'],
    down: [cx, cy + 32, cx, cy + 95, cx, cy + 113, 'middle'],
    left: [cx - 60, cy, cx - 170, cy, cx - 115, cy + 28, 'middle'],
    right: [cx + 60, cy, cx + 170, cy, cx + 115, cy + 28, 'middle'],
  }
  // Horizontal-only diagrams don't need the vertical space.
  const vertical = data.arrows.some((a) => a.dir === 'up' || a.dir === 'down')
  return (
    <Frame label={`Force diagram on ${data.body}: ${data.arrows.map((a) => `${a.label} acting ${a.dir}`).join('; ')}.`} viewBox={vertical ? '0 0 440 240' : '0 70 440 100'}>
      <rect x={cx - 60} y={cy - 32} width={120} height={64} rx={8} fill={CHART.surface} stroke={LINE} strokeWidth={1.5} />
      <text x={cx} y={cy + 5} textAnchor="middle" fill={INK} {...font}>
        {data.body}
      </text>
      {data.arrows.map((a) => {
        const [x1, y1, x2, y2, lx, ly, anchor] = tip[a.dir]
        return (
          <g key={a.dir}>
            <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={ACCENT} strokeWidth={3} markerEnd="url(#arrow)" />
            <text x={lx} y={ly} textAnchor={anchor} fill={INK} {...font}>
              {a.label}
            </text>
          </g>
        )
      })}
    </Frame>
  )
}

/* ---------- lever ---------- */

function Lever({ data }: { data: Extract<D, { kind: 'lever' }> }) {
  const x0 = 40
  const x1 = 400
  const y = 110
  const sx = (m: number) => x0 + (m / data.length) * (x1 - x0)
  const label = `Beam ${data.length} m long with pivot ${data.pivot} m from the left end. Loads: ${data.loads.map((l) => `${l.label} at ${l.at} m`).join(', ')}.`
  return (
    <Frame label={label} viewBox="0 0 440 210">
      <rect x={x0} y={y - 6} width={x1 - x0} height={12} rx={3} fill={CHART.surface} stroke={LINE} strokeWidth={1.5} />
      <path d={`M${sx(data.pivot)} ${y + 6} l-16 30 h32 z`} fill={LINE} />
      {data.loads.map((l, i) => {
        const x = sx(l.at)
        return (
          <g key={i}>
            <line x1={x} y1={y - 62} x2={x} y2={y - 10} stroke={ACCENT} strokeWidth={3} markerEnd="url(#arrow)" />
            <text x={Math.min(Math.max(x, 40), 400)} y={y - 70} textAnchor="middle" fill={INK} {...font}>
              {l.label}
            </text>
          </g>
        )
      })}
      {data.marks.map((m, i) => {
        const yy = y + 52 + i * 24
        const a = sx(m.from)
        const b = sx(m.to)
        return (
          <g key={i}>
            <line x1={a} y1={yy} x2={b} y2={yy} stroke={MUTED} strokeWidth={1.2} markerStart="url(#dim)" markerEnd="url(#dim)" />
            <line x1={a} y1={yy - 6} x2={a} y2={yy + 6} stroke={MUTED} />
            <line x1={b} y1={yy - 6} x2={b} y2={yy + 6} stroke={MUTED} />
            <text x={(a + b) / 2} y={yy - 6} textAnchor="middle" fill={MUTED} {...font}>
              {m.label}
            </text>
          </g>
        )
      })}
    </Frame>
  )
}

/* ---------- pulley ---------- */

function Pulley({ data }: { data: Extract<D, { kind: 'pulley' }> }) {
  const n = data.strands
  const left = 150
  const gap = 26
  const xs = Array.from({ length: n }, (_, i) => left + i * gap)
  const right = xs[n - 1]
  const topY = 40
  const lowY = 170
  return (
    <Frame label={`Pulley system with ${n} rope sections supporting the lower block and a load of ${data.load}. Effort: ${data.effort}.`} viewBox="0 0 440 260">
      <rect x={100} y={14} width={240} height={10} fill={LINE} />
      <rect x={left - 14} y={topY - 14} width={right - left + 28} height={26} rx={12} fill={CHART.surface} stroke={LINE} strokeWidth={1.5} />
      <line x1={(left + right) / 2} y1={24} x2={(left + right) / 2} y2={topY - 14} stroke={LINE} strokeWidth={2} />
      <rect x={left - 14} y={lowY - 12} width={right - left + 28} height={26} rx={12} fill={CHART.surface} stroke={LINE} strokeWidth={1.5} />
      {xs.map((x) => (
        <line key={x} x1={x} y1={topY + 12} x2={x} y2={lowY - 12} stroke={INK} strokeWidth={2} />
      ))}
      {/* free end of the rope, pulled by the effort */}
      <path d={`M${right + 14} ${topY} h40 v120`} fill="none" stroke={INK} strokeWidth={2} />
      <line x1={right + 54} y1={topY + 120} x2={right + 54} y2={topY + 160} stroke={ACCENT} strokeWidth={3} markerEnd="url(#arrow)" />
      <text x={right + 64} y={topY + 150} fill={INK} {...font}>
        {data.effort}
      </text>
      <line x1={(left + right) / 2} y1={lowY + 14} x2={(left + right) / 2} y2={lowY + 34} stroke={LINE} strokeWidth={2} />
      <rect x={(left + right) / 2 - 50} y={lowY + 34} width={100} height={40} rx={4} fill={CHART.surface} stroke={LINE} strokeWidth={1.5} />
      <text x={(left + right) / 2} y={lowY + 59} textAnchor="middle" fill={INK} {...font}>
        {data.load}
      </text>
      <text x={left - 24} y={(topY + lowY) / 2 + 4} textAnchor="end" fill={MUTED} {...font}>
        {n} ropes
      </text>
    </Frame>
  )
}

/* ---------- circuit ---------- */

function Resistor({ x, y, label, vertical = false }: { x: number; y: number; label: string; vertical?: boolean }) {
  return vertical ? (
    <g>
      <rect x={x - 10} y={y - 24} width={20} height={48} fill={CHART.well} stroke={INK} strokeWidth={2} />
      <text x={x + 18} y={y + 5} fill={INK} {...font}>
        {label}
      </text>
    </g>
  ) : (
    <g>
      <rect x={x - 26} y={y - 10} width={52} height={20} fill={CHART.well} stroke={INK} strokeWidth={2} />
      <text x={x} y={y - 18} textAnchor="middle" fill={INK} {...font}>
        {label}
      </text>
    </g>
  )
}

function ParallelPair({ x, y, a, b }: { x: number; y: number; a: string; b: string }) {
  return (
    <g>
      <path d={`M${x - 60} ${y} h20 M${x + 40} ${y} h20 M${x - 40} ${y - 26} v52 M${x + 40} ${y - 26} v52 M${x - 40} ${y - 26} h80 M${x - 40} ${y + 26} h80`} stroke={INK} strokeWidth={2} fill="none" />
      <rect x={x - 22} y={y - 34} width={44} height={16} fill={CHART.well} stroke={INK} strokeWidth={2} />
      <rect x={x - 22} y={y + 18} width={44} height={16} fill={CHART.well} stroke={INK} strokeWidth={2} />
      <text x={x} y={y - 40} textAnchor="middle" fill={INK} {...font}>
        {a}
      </text>
      <text x={x} y={y + 52} textAnchor="middle" fill={INK} {...font}>
        {b}
      </text>
    </g>
  )
}

function Circuit({ data }: { data: Extract<D, { kind: 'circuit' }> }) {
  const label = `${data.layout === 'parallel' ? 'Parallel' : 'Series'} circuit${data.source ? ` with a ${data.source} supply` : ''}: ${data.resistors.join(', ')}.`
  if (!data.source) {
    // Bare network between terminals A and B.
    if (data.layout === 'parallel') {
      return (
        <Frame label={label} viewBox="0 0 440 200">
          <path d="M60 100 h80 M300 100 h80 M140 50 v100 M300 50 v100 M140 50 h160 M140 150 h160" stroke={INK} strokeWidth={2} fill="none" />
          <Resistor x={220} y={50} label={data.resistors[0]} />
          <Resistor x={220} y={150} label={data.resistors[1]} />
          <Terminal x={60} y={100} name="A" />
          <Terminal x={380} y={100} name="B" />
        </Frame>
      )
    }
    const n = data.resistors.length
    const step = 300 / n
    return (
      <Frame label={label} viewBox="0 0 440 140">
        <line x1={60} y1={80} x2={380} y2={80} stroke={INK} strokeWidth={2} />
        {data.resistors.map((r, i) => (
          <Resistor key={i} x={70 + step * (i + 0.5)} y={80} label={r} />
        ))}
        <Terminal x={60} y={80} name="A" />
        <Terminal x={380} y={80} name="B" />
      </Frame>
    )
  }
  const n = data.resistors.length
  const step = 280 / n
  return (
    <Frame label={label} viewBox="0 0 440 240">
      <path d="M60 60 h320 v140 h-320 z" stroke={INK} strokeWidth={2} fill="none" />
      {/* battery on the left side */}
      <rect x={50} y={110} width={20} height={30} fill={CHART.well} />
      <line x1={44} y1={118} x2={76} y2={118} stroke={INK} strokeWidth={3} />
      <line x1={52} y1={132} x2={68} y2={132} stroke={INK} strokeWidth={5} />
      <text x={84} y={130} fill={INK} {...font}>
        {data.source}
      </text>
      {data.resistors.map((r, i) => {
        const x = 80 + step * (i + 0.5)
        const pair = r.split(' ∥ ')
        return pair.length === 2 ? <ParallelPair key={i} x={x} y={60} a={pair[0]} b={pair[1]} /> : <Resistor key={i} x={x} y={60} label={r} />
      })}
    </Frame>
  )
}

function Terminal({ x, y, name }: { x: number; y: number; name: string }) {
  return (
    <g>
      <circle cx={x} cy={y} r={5} fill={CHART.well} stroke={INK} strokeWidth={2} />
      <text x={x} y={y + 24} textAnchor="middle" fill={MUTED} {...font}>
        {name}
      </text>
    </g>
  )
}

/* ---------- graphs ---------- */

const G = { left: 56, right: 410, top: 24, bottom: 220 }

function Axes({ xMax, yMax, xStep, yStep, xLabel, yLabel }: { xMax: number; yMax: number; xStep: number; yStep: number; xLabel: string; yLabel: string }) {
  const sx = (v: number) => G.left + (v / xMax) * (G.right - G.left)
  const sy = (v: number) => G.bottom - (v / yMax) * (G.bottom - G.top)
  const xt = Array.from({ length: Math.floor(xMax / xStep) + 1 }, (_, i) => i * xStep)
  const yt = Array.from({ length: Math.floor(yMax / yStep) + 1 }, (_, i) => i * yStep)
  return (
    <g>
      {yt.map((v) => (
        <g key={`y${v}`}>
          <line x1={G.left} x2={G.right} y1={sy(v)} y2={sy(v)} stroke={CHART.grid} />
          <text x={G.left - 8} y={sy(v) + 4} textAnchor="end" fill={MUTED} {...font} fontSize={11}>
            {v}
          </text>
        </g>
      ))}
      {xt.map((v) => (
        <g key={`x${v}`}>
          <line x1={sx(v)} x2={sx(v)} y1={G.top} y2={G.bottom} stroke={CHART.grid} strokeDasharray="2 4" />
          <text x={sx(v)} y={G.bottom + 16} textAnchor="middle" fill={MUTED} {...font} fontSize={11}>
            {v}
          </text>
        </g>
      ))}
      <line x1={G.left} x2={G.right} y1={G.bottom} y2={G.bottom} stroke={LINE} strokeWidth={1.5} />
      <line x1={G.left} x2={G.left} y1={G.top} y2={G.bottom} stroke={LINE} strokeWidth={1.5} />
      <text x={(G.left + G.right) / 2} y={G.bottom + 36} textAnchor="middle" fill={INK} {...font} fontSize={12}>
        {xLabel}
      </text>
      <text x={14} y={(G.top + G.bottom) / 2} textAnchor="middle" fill={INK} {...font} fontSize={12} transform={`rotate(-90 14 ${(G.top + G.bottom) / 2})`}>
        {yLabel}
      </text>
    </g>
  )
}

function Graph({ data }: { data: Extract<D, { kind: 'graph' }> }) {
  const sx = (v: number) => G.left + (v / data.xMax) * (G.right - G.left)
  const sy = (v: number) => G.bottom - (v / data.yMax) * (G.bottom - G.top)
  const label = `${data.title}. Points (${data.xLabel}, ${data.yLabel}): ${data.points.map(([x, y]) => `(${x}, ${y})`).join(', ')}.`
  return (
    <Frame label={label} viewBox="0 0 440 268">
      <Axes {...data} />
      <polyline points={data.points.map(([x, y]) => `${sx(x)},${sy(y)}`).join(' ')} fill="none" stroke={ACCENT} strokeWidth={2.5} />
      {data.points.map(([x, y], i) => (
        <circle key={i} cx={sx(x)} cy={sy(y)} r={3.5} fill={ACCENT} />
      ))}
      {data.segmentLabels?.map((s, i) => {
        const a = data.points[i]
        const b = data.points[i + 1]
        if (!a || !b) return null
        return (
          <text key={s} x={(sx(a[0]) + sx(b[0])) / 2 - 10} y={(sy(a[1]) + sy(b[1])) / 2 - 10} fill={INK} {...font} fontWeight={700}>
            {s}
          </text>
        )
      })}
    </Frame>
  )
}

function Bars({ data }: { data: Extract<D, { kind: 'bars' }> }) {
  const n = data.labels.length
  const band = (G.right - G.left) / n
  const sy = (v: number) => G.bottom - (v / data.yMax) * (G.bottom - G.top)
  const ticks = Array.from({ length: Math.floor(data.yMax / data.yStep) + 1 }, (_, i) => i * data.yStep)
  return (
    <Frame label={`${data.title}: ${data.labels.map((l, i) => `${l} ${data.values[i]}`).join(', ')} (${data.unit}).`} viewBox="0 0 440 268">
      {ticks.map((v) => (
        <g key={v}>
          <line x1={G.left} x2={G.right} y1={sy(v)} y2={sy(v)} stroke={CHART.grid} />
          <text x={G.left - 8} y={sy(v) + 4} textAnchor="end" fill={MUTED} {...font} fontSize={11}>
            {v}
          </text>
        </g>
      ))}
      {data.values.map((v, i) => (
        <g key={i}>
          <rect x={G.left + band * i + band * 0.2} y={sy(v)} width={band * 0.6} height={G.bottom - sy(v)} rx={3} fill={CHART.series[0]} />
          <text x={G.left + band * (i + 0.5)} y={G.bottom + 16} textAnchor="middle" fill={MUTED} {...font} fontSize={11}>
            {data.labels[i]}
          </text>
        </g>
      ))}
      <line x1={G.left} x2={G.right} y1={G.bottom} y2={G.bottom} stroke={LINE} strokeWidth={1.5} />
      <text x={(G.left + G.right) / 2} y={G.bottom + 38} textAnchor="middle" fill={INK} {...font} fontSize={12}>
        {data.title}
      </text>
    </Frame>
  )
}

function Table({ data }: { data: Extract<D, { kind: 'table' }> }) {
  return (
    <div className="overflow-x-auto rounded-control border border-hairline bg-well">
      <table className="w-full min-w-[280px] text-sm">
        <caption className="px-3 pt-2 text-left text-xs font-medium tracking-[0.08em] text-muted uppercase">{data.title}</caption>
        <thead>
          <tr className="border-b border-hairline">
            {data.headers.map((h) => (
              <th key={h} scope="col" className="px-3 py-2 text-left font-medium text-muted">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.rows.map((row) => (
            <tr key={row[0]} className="border-b border-hairline/60 last:border-0">
              {row.map((cell, i) =>
                i === 0 ? (
                  <th key={i} scope="row" className="px-3 py-2 text-left font-medium text-ink">
                    {cell}
                  </th>
                ) : (
                  <td key={i} className="num px-3 py-2 text-ink">
                    {cell}
                  </td>
                ),
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

/* ---------- geometry ---------- */

function Triangle({ data }: { data: Extract<D, { kind: 'triangle' }> }) {
  // Right angle at bottom-left (A), horizontal leg to B, vertical leg up to C.
  const A: [number, number] = [90, 200]
  const B: [number, number] = [360, 200]
  const C: [number, number] = [90, 50]
  const label = `Right-angled triangle. Vertical side: ${data.vertical || 'unlabelled'}; horizontal side: ${data.horizontal || 'unlabelled'}; hypotenuse: ${data.hypotenuse || 'unlabelled'}${data.angle ? `; angle at the base: ${data.angle}` : ''}.`
  return (
    <Frame label={label} viewBox="0 0 440 240">
      <path d={`M${A} L${B} L${C} z`} fill={CHART.surface} stroke={INK} strokeWidth={2} />
      <path d={`M${A[0]} ${A[1] - 16} h16 v16`} fill="none" stroke={MUTED} strokeWidth={1.5} />
      {data.vertical && (
        <text x={A[0] - 10} y={(A[1] + C[1]) / 2} textAnchor="end" fill={INK} {...font}>
          {data.vertical}
        </text>
      )}
      {data.horizontal && (
        <text x={(A[0] + B[0]) / 2} y={A[1] + 24} textAnchor="middle" fill={INK} {...font}>
          {data.horizontal}
        </text>
      )}
      {data.hypotenuse && (
        <text x={(B[0] + C[0]) / 2 + 14} y={(B[1] + C[1]) / 2 - 8} fill={INK} {...font}>
          {data.hypotenuse}
        </text>
      )}
      {data.angle && (
        <g>
          <path d={`M${B[0] - 44} ${B[1]} A44 44 0 0 1 ${B[0] - 44 * Math.cos(Math.atan2(150, 270))} ${B[1] - 44 * Math.sin(Math.atan2(150, 270))}`} fill="none" stroke={ACCENT} strokeWidth={1.5} />
          <text x={B[0] - 62} y={B[1] - 8} textAnchor="end" fill={ACCENT} {...font}>
            {data.angle}
          </text>
        </g>
      )}
    </Frame>
  )
}

/* ---------- particles ---------- */

function hash(s: string, i: number) {
  let h = 2166136261 ^ i
  for (const ch of s) h = Math.imul(h ^ ch.charCodeAt(0), 16777619)
  return ((h >>> 0) % 1000) / 1000
}

function Particles({ data }: { data: Extract<D, { kind: 'particles' }> }) {
  const W = 120
  const H = 120
  return (
    <Frame
      label={`Three boxes of particles. ${data.boxes.map((b) => `Box ${b.label}: ${b.state === 'solid' ? 'particles close together in a regular pattern' : b.state === 'liquid' ? 'particles close together, randomly arranged' : 'particles far apart, randomly arranged'}`).join('. ')}.`}
      viewBox="0 0 440 180"
    >
      {data.boxes.map((b, bi) => {
        const ox = 20 + bi * 140
        const oy = 14
        let pts: [number, number][] = []
        if (b.state === 'solid') {
          for (let r = 0; r < 6; r++) for (let c = 0; c < 6; c++) pts.push([ox + 15 + c * 18, oy + 30 + r * 18])
        } else if (b.state === 'liquid') {
          for (let r = 0; r < 5; r++)
            for (let c = 0; c < 6; c++)
              if (hash(b.label, r * 6 + c) > 0.12) pts.push([ox + 14 + c * 18 + (hash(b.label, 100 + r * 6 + c) - 0.5) * 7, oy + 46 + r * 17 + (hash(b.label, 200 + r * 6 + c) - 0.5) * 6])
        } else {
          // Scattered, well separated particles (seeded so the picture is stable).
          const r = createRng(b.label.charCodeAt(0) * 7919)
          for (let tries = 0; pts.length < 8 && tries < 400; tries++) {
            const p: [number, number] = [ox + 14 + r.next() * (W - 28), oy + 14 + r.next() * (H - 28)]
            if (pts.every(([x, y]) => Math.hypot(x - p[0], y - p[1]) > 30)) pts.push(p)
          }
        }
        return (
          <g key={b.label}>
            <rect x={ox} y={oy} width={W} height={H} rx={4} fill="none" stroke={LINE} strokeWidth={1.5} />
            {pts.map(([x, y], i) => (
              <circle key={i} cx={x} cy={y} r={7.5} fill={CHART.series[0]} stroke={CHART.well} strokeWidth={1} />
            ))}
            <text x={ox + W / 2} y={oy + H + 26} textAnchor="middle" fill={INK} {...font} fontWeight={700}>
              Box {b.label}
            </text>
          </g>
        )
      })}
    </Frame>
  )
}

/* ---------- waves ---------- */

function Wave({ data }: { data: Extract<D, { kind: 'wave' }> }) {
  const x0 = 40
  const x1 = 400
  const mid = 90
  const amp = 46
  const steps = 240
  const d = Array.from({ length: steps + 1 }, (_, i) => {
    const x = x0 + ((x1 - x0) * i) / steps
    const y = mid - amp * Math.sin((2 * Math.PI * data.cycles * i) / steps)
    return `${i ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`
  }).join(' ')
  return (
    <Frame label={`Wave showing ${data.cycles} complete cycles across ${data.spanLabel}.`} viewBox="0 0 440 200">
      <line x1={x0} x2={x1} y1={mid} y2={mid} stroke={CHART.grid} strokeDasharray="4 4" />
      <path d={d} fill="none" stroke={ACCENT} strokeWidth={2.5} />
      <line x1={x0} x2={x1} y1={170} y2={170} stroke={MUTED} strokeWidth={1.2} markerStart="url(#dim)" markerEnd="url(#dim)" />
      <line x1={x0} x2={x0} y1={160} y2={180} stroke={MUTED} />
      <line x1={x1} x2={x1} y1={160} y2={180} stroke={MUTED} />
      <text x={(x0 + x1) / 2} y={162} textAnchor="middle" fill={INK} {...font}>
        {data.spanLabel}
      </text>
    </Frame>
  )
}
