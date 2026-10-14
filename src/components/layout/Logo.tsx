/** Attitude-indicator mark: a ring with a level horizon. Simple geometry, no illustration. */
export function LogoMark({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden focusable="false">
      <rect width="32" height="32" rx="8" fill="#1D3046" />
      <circle cx="16" cy="16" r="10" fill="none" stroke="#71C5EB" strokeWidth="2" />
      <path
        d="M6 17.5h7l3-3 3 3h7"
        fill="none"
        stroke="#E7EDF4"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export function Logo() {
  return (
    <span className="flex items-center gap-2.5">
      <LogoMark />
      <span className="font-mono text-base font-semibold tracking-[0.12em] text-ink">
        CADET<span className="text-accent"> OS</span>
      </span>
    </span>
  )
}
