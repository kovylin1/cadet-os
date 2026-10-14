import {
  CartesianGrid,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { Attempt } from '../../types'
import { formatDay } from '../../lib/dates'
import { formatCompact, formatValue, scaleInfo, valueOn, type ScaleKey } from '../../lib/metrics'
import { CHART, axisTick, type TipProps } from './theme'

interface Row {
  fatigue: number
  value: number
  attempt: Attempt
}

export function fatigueRows(attempts: Attempt[], scale: ScaleKey): Row[] {
  const rows: Row[] = []
  for (const a of attempts) {
    const value = valueOn(a, scale)
    if (value != null && a.fatigue != null) rows.push({ fatigue: a.fatigue, value, attempt: a })
  }
  return rows
}

/** Fatigue rating (x) against score on ONE scale (y). Exploratory only — see the caveat beside it. */
export function FatigueScatter({ rows, scale }: { rows: Row[]; scale: ScaleKey }) {
  const info = scaleInfo(scale)
  return (
    <figure className="m-0">
      <figcaption className="sr-only">
        Scatter plot of mental fatigue rating against {info.label} for {rows.length} attempts.
      </figcaption>
      <div className="h-64" aria-hidden>
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart margin={{ top: 8, right: 16, bottom: 20, left: 0 }}>
            <CartesianGrid stroke={CHART.grid} />
            <XAxis
              type="number"
              dataKey="fatigue"
              domain={[0.5, 5.5]}
              ticks={[1, 2, 3, 4, 5]}
              tick={axisTick}
              tickLine={false}
              axisLine={{ stroke: CHART.axis }}
              label={{ value: 'Mental fatigue (1 fresh – 5 exhausted)', position: 'insideBottom', offset: -12, fill: CHART.muted, fontSize: 12 }}
            />
            <YAxis
              type="number"
              dataKey="value"
              domain={info.min != null && info.max != null ? [info.min, info.max] : ['auto', 'auto']}
              tick={axisTick}
              tickLine={false}
              axisLine={false}
              width={48}
              tickFormatter={(v: number) => formatCompact(v, scale)}
            />
            <Tooltip cursor={{ strokeDasharray: '3 3', stroke: CHART.axis }} content={(p) => <ScatterTooltip active={p.active} payload={p.payload} scale={scale} />} />
            <Scatter data={rows} fill={CHART.accent} stroke={CHART.surface} strokeWidth={2} isAnimationActive={false} />
          </ScatterChart>
        </ResponsiveContainer>
      </div>
    </figure>
  )
}

function ScatterTooltip({ active, payload, scale }: TipProps & { scale: ScaleKey }) {
  if (!active || !payload?.length) return null
  const row = payload[0].payload as Row
  return (
    <div className="rounded-control border border-hairline bg-plane px-3 py-2 text-sm shadow-lg shadow-black/30">
      <p className="text-xs text-muted">{formatDay(row.attempt.date, 'EEE d MMM')}</p>
      <p className="font-medium text-ink">{row.attempt.name}</p>
      <p className="num text-ink">
        {formatValue(row.value, scale)} · fatigue {row.fatigue}/5
      </p>
    </div>
  )
}
