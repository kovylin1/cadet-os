import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { formatDay } from '../../lib/dates'
import { formatCompact, formatValue, scaleInfo, type ScaleStats } from '../../lib/metrics'
import { CHART, axisTick, type TipProps } from './theme'

interface Row {
  i: number
  label: string
  value: number
  name: string
  date: string
  isBest: boolean
}

/** One category, one scale. Single series, so no legend — the card title names it. */
export function ScoreChart({ stats, height = 260 }: { stats: ScaleStats; height?: number }) {
  const info = scaleInfo(stats.scale)
  const sameDayCount = new Map<string, number>()
  const rows: Row[] = stats.points.map((p, i) => {
    const n = (sameDayCount.get(p.attempt.date) ?? 0) + 1
    sameDayCount.set(p.attempt.date, n)
    return {
      i,
      label: formatDay(p.attempt.date, 'd MMM') + (n > 1 ? ` (${n})` : ''),
      value: p.value,
      name: p.attempt.name,
      date: p.attempt.date,
      isBest: p === stats.best,
    }
  })

  const values = rows.map((r) => r.value)
  const lo = Math.min(...values)
  const hi = Math.max(...values)
  const pad = Math.max((hi - lo) * 0.25, info.max != null && info.min != null ? (info.max - info.min) * 0.05 : Math.abs(hi) * 0.05 || 1)
  const domain: [number, number] = [
    info.min != null ? Math.max(info.min, Math.floor(lo - pad)) : Math.floor(lo - pad),
    info.max != null ? Math.min(info.max, Math.ceil(hi + pad)) : Math.ceil(hi + pad),
  ]

  const summary = `Line chart of ${info.label} across ${rows.length} attempts, from ${formatValue(stats.first.value, stats.scale)} to ${formatValue(stats.latest.value, stats.scale)}. Personal best ${formatValue(stats.best.value, stats.scale)}.`

  return (
    <figure className="m-0">
      <figcaption className="sr-only">{summary}</figcaption>
      <div style={{ height }} aria-hidden>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={rows} margin={{ top: 24, right: 40, bottom: 4, left: 0 }}>
            <CartesianGrid stroke={CHART.grid} vertical={false} />
            <XAxis
              dataKey="label"
              tick={axisTick}
              tickLine={false}
              axisLine={{ stroke: CHART.axis }}
              interval="preserveStartEnd"
              minTickGap={16}
              tickMargin={8}
              height={32}
            />
            <YAxis
              domain={domain}
              tick={axisTick}
              tickLine={false}
              axisLine={false}
              width={48}
              tickMargin={6}
              tickCount={5}
              allowDecimals={stats.scale !== 'sten'}
              tickFormatter={(v: number) => formatCompact(v, stats.scale)}
            />
            {rows.length > 1 && (
              <ReferenceLine
                y={stats.average}
                stroke={CHART.muted}
                strokeDasharray="4 4"
                label={{ value: 'avg', position: 'insideTopRight', fill: CHART.muted, fontSize: 11 }}
              />
            )}
            <Tooltip
              cursor={{ stroke: CHART.axis }}
              content={(p) => <ScoreTooltip active={p.active} payload={p.payload} scale={stats.scale} />}
            />
            <Line
              type="linear"
              dataKey="value"
              stroke={CHART.accent}
              strokeWidth={2}
              isAnimationActive={false}
              dot={(props: { cx?: number; cy?: number; payload?: Row; index?: number }) => (
                <ScoreDot key={props.index} {...props} />
              )}
              activeDot={{ r: 6, fill: CHART.accent, stroke: CHART.surface, strokeWidth: 2 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </figure>
  )
}

function ScoreDot({ cx, cy, payload }: { cx?: number; cy?: number; payload?: Row }) {
  if (cx == null || cy == null || !payload) return null
  if (!payload.isBest) {
    return <circle cx={cx} cy={cy} r={4} fill={CHART.accent} stroke={CHART.surface} strokeWidth={2} />
  }
  // Personal best: larger ring + direct label, so it's not marked by colour alone.
  return (
    <g>
      <circle cx={cx} cy={cy} r={7} fill="none" stroke={CHART.good} strokeWidth={2} />
      <circle cx={cx} cy={cy} r={4} fill={CHART.accent} />
      <text x={cx} y={cy - 13} textAnchor="middle" fill={CHART.ink} fontSize={11} fontWeight={600} fontFamily="var(--font-mono)">
        PB
      </text>
    </g>
  )
}

function ScoreTooltip({ active, payload, scale }: TipProps & { scale: ScaleStats['scale'] }) {
  if (!active || !payload?.length) return null
  const row = payload[0].payload as Row
  return (
    <div className="rounded-control border border-hairline bg-plane px-3 py-2 text-sm shadow-lg shadow-black/30">
      <p className="text-xs text-muted">{formatDay(row.date, 'EEE d MMM yyyy')}</p>
      <p className="font-medium text-ink">{row.name}</p>
      <p className="num mt-0.5 text-ink">
        {formatValue(row.value, scale)}
        {row.isBest && <span className="ml-2 text-xs text-good">Personal best</span>}
      </p>
    </div>
  )
}
