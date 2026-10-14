import type { ScaleStats } from '../../lib/metrics'
import { CHART } from './theme'

/**
 * Tiny trend line for the category small multiples. Each one is drawn on its
 * own scale, so categories are never forced onto a shared axis. Plain SVG —
 * cheaper than a full chart for something this small.
 */
export function Sparkline({ stats, width = 120, height = 36 }: { stats: ScaleStats; width?: number; height?: number }) {
  const values = stats.points.map((p) => p.value)
  if (values.length < 2) {
    return (
      <svg width={width} height={height} aria-hidden className="overflow-visible">
        <line x1={0} x2={width} y1={height / 2} y2={height / 2} stroke={CHART.grid} strokeDasharray="3 3" />
        <circle cx={width - 4} cy={height / 2} r={4} fill={CHART.accent} />
      </svg>
    )
  }
  const lo = Math.min(...values)
  const hi = Math.max(...values)
  const span = hi - lo || 1
  const pad = 4
  const x = (i: number) => pad + (i / (values.length - 1)) * (width - pad * 2)
  const y = (v: number) => (hi === lo ? height / 2 : pad + (1 - (v - lo) / span) * (height - pad * 2))
  const d = values.map((v, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ')
  const last = values.length - 1
  return (
    <svg width={width} height={height} aria-hidden className="overflow-visible">
      <path d={d} fill="none" stroke={CHART.accent} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={x(last)} cy={y(values[last])} r={3.5} fill={CHART.accent} stroke={CHART.surface} strokeWidth={2} />
    </svg>
  )
}
