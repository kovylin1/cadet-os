import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { Session } from '../../types'
import { formatDay } from '../../lib/dates'
import { CHART, axisTick, type TipProps } from './theme'

const SERIES = [
  { key: 'energyBefore', label: 'Energy before', color: CHART.series[0], dash: undefined },
  { key: 'energyAfter', label: 'Energy after', color: CHART.series[1], dash: '6 3' },
  { key: 'concentration', label: 'Concentration', color: CHART.series[2], dash: '2 3' },
] as const

/** Three self-ratings on the same 1–5 scale — one axis is honest here. Dashes give a second, non-colour cue. */
export function EnergyChart({ sessions }: { sessions: Session[] }) {
  const rows = [...sessions]
    .sort((a, b) => a.date.localeCompare(b.date) || a.createdAt.localeCompare(b.createdAt))
    .map((s) => ({ ...s, label: formatDay(s.date, 'd MMM') }))

  return (
    <figure className="m-0">
      <figcaption className="sr-only">
        Line chart of energy before, energy after and concentration (1 to 5) across {rows.length} logged sessions.
      </figcaption>
      <div className="h-64" aria-hidden>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={rows} margin={{ top: 8, right: 16, bottom: 4, left: 0 }}>
            <CartesianGrid stroke={CHART.grid} vertical={false} />
            <XAxis dataKey="label" tick={axisTick} tickLine={false} axisLine={{ stroke: CHART.axis }} minTickGap={16} />
            <YAxis domain={[1, 5]} ticks={[1, 2, 3, 4, 5]} tick={axisTick} tickLine={false} axisLine={false} width={32} />
            <Tooltip cursor={{ stroke: CHART.axis }} content={(p) => <EnergyTooltip active={p.active} payload={p.payload} />} />
            <Legend
              verticalAlign="top"
              align="left"
              height={32}
              iconType="plainline"
              wrapperStyle={{ fontSize: 13, color: CHART.muted }}
              formatter={(value: string) => <span style={{ color: CHART.ink }}>{value}</span>}
            />
            {SERIES.map((s) => (
              <Line
                key={s.key}
                dataKey={s.key}
                name={s.label}
                stroke={s.color}
                strokeWidth={2}
                strokeDasharray={s.dash}
                isAnimationActive={false}
                dot={{ r: 4, fill: s.color, stroke: CHART.surface, strokeWidth: 2 }}
                activeDot={{ r: 6, stroke: CHART.surface, strokeWidth: 2 }}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </figure>
  )
}

function EnergyTooltip({ active, payload }: TipProps) {
  if (!active || !payload?.length) return null
  const s = payload[0].payload as Session
  return (
    <div className="rounded-control border border-hairline bg-plane px-3 py-2 text-sm shadow-lg shadow-black/30">
      <p className="mb-1 text-xs text-muted">
        {formatDay(s.date, 'EEE d MMM')} · <span className="num">{s.durationMinutes}</span> min
      </p>
      {SERIES.map((series) => (
        <p key={series.key} className="flex items-center justify-between gap-4">
          <span className="flex items-center gap-2 text-ink">
            <span aria-hidden className="inline-block h-0.5 w-3" style={{ background: series.color }} />
            {series.label}
          </span>
          <span className="num text-ink">{s[series.key]}/5</span>
        </p>
      ))}
    </div>
  )
}
