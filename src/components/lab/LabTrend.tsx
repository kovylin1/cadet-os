import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { HistoryPoint } from '../../lab/stats'
import { DIFFICULTY_LABEL } from '../../lab/types'
import { formatDay } from '../../lib/dates'
import { CHART, axisTick, type TipProps } from '../charts/theme'

type Metric = 'accuracy' | 'secPerQ'

interface Row extends HistoryPoint {
  label: string
  value: number
}

/** One subject, one metric (accuracy % or seconds per question). Single series, so no legend. */
export function LabTrend({ points, metric = 'accuracy', height = 200 }: { points: HistoryPoint[]; metric?: Metric; height?: number }) {
  const seen = new Map<string, number>()
  const rows: Row[] = points.map((p) => {
    const n = (seen.get(p.date) ?? 0) + 1
    seen.set(p.date, n)
    return { ...p, label: formatDay(p.date, 'd MMM') + (n > 1 ? ` (${n})` : ''), value: Math.round(p[metric] * 10) / 10 }
  })
  const unit = metric === 'accuracy' ? '%' : ' s'
  const summary = `Line chart of ${metric === 'accuracy' ? 'accuracy' : 'seconds per question'} over ${rows.length} tests: ${rows.map((r) => `${r.label} ${r.value}${unit}`).join(', ')}.`
  return (
    <figure className="m-0">
      <figcaption className="sr-only">{summary}</figcaption>
      <div style={{ height }} aria-hidden>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={rows} margin={{ top: 16, right: 40, bottom: 4, left: 0 }}>
            <CartesianGrid stroke={CHART.grid} vertical={false} />
            <XAxis dataKey="label" tick={axisTick} tickLine={false} axisLine={{ stroke: CHART.axis }} interval="preserveStartEnd" minTickGap={16} tickMargin={8} height={30} />
            <YAxis
              domain={metric === 'accuracy' ? [0, 100] : [0, 'auto']}
              tick={axisTick}
              tickLine={false}
              axisLine={false}
              width={44}
              tickFormatter={(v: number) => `${v}${metric === 'accuracy' ? '%' : 's'}`}
            />
            <Tooltip cursor={{ stroke: CHART.axis }} content={(p) => <Tip active={p.active} payload={p.payload} unit={unit} />} />
            <Line type="linear" dataKey="value" stroke={CHART.accent} strokeWidth={2} isAnimationActive={false} dot={{ r: 4, fill: CHART.accent, stroke: CHART.surface, strokeWidth: 2 }} activeDot={{ r: 6 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </figure>
  )
}

function Tip({ active, payload, unit }: TipProps & { unit: string }) {
  if (!active || !payload?.length) return null
  const r = payload[0].payload as Row
  return (
    <div className="rounded-control border border-hairline bg-plane px-3 py-2 text-sm shadow-lg shadow-black/30">
      <p className="text-xs text-muted">{formatDay(r.date, 'EEE d MMM yyyy')}</p>
      <p className="num text-ink">
        {r.value}
        {unit}
      </p>
      <p className="text-xs text-muted">
        {r.count} questions · mostly {DIFFICULTY_LABEL[Math.round(r.difficulty) as 1 | 2 | 3]}
      </p>
    </div>
  )
}
