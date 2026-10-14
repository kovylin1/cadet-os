/*
 * Chart chrome. Values mirror the CSS tokens in index.css; Recharts needs
 * literal colours for SVG attributes. Series colours were validated with the
 * dataviz palette checker against the #1D3046 surface (CVD ΔE ≥ 22, ≥ 3:1).
 */
export const CHART = {
  surface: '#1D3046',
  grid: '#2C4462',
  axis: '#4A6585',
  muted: '#93A8BE',
  ink: '#E7EDF4',
  accent: '#71C5EB',
  good: '#6FCF97',
  series: ['#2F9FD8', '#DE6A36', '#9282EC'] as const,
}

export const axisTick = {
  fill: CHART.muted,
  fontSize: 12,
  fontFamily: 'JetBrains Mono Variable, ui-monospace, monospace',
}

/** Minimal tooltip props we rely on (Recharts' own generics are awkward across versions). */
export interface TipProps {
  active?: boolean
  payload?: ReadonlyArray<{ payload?: unknown }>
}
