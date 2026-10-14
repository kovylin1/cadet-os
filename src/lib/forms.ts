export type NumberParse = { ok: true; value: number | null } | { ok: false; error: string }

interface NumberRules {
  min?: number
  max?: number
  integer?: boolean
  label: string
}

/** Parses an optional numeric text field. Empty → null. Accepts "69,6" as well as "69.6". */
export function parseOptionalNumber(text: string, { min, max, integer, label }: NumberRules): NumberParse {
  const trimmed = text.trim().replace(',', '.')
  if (trimmed === '') return { ok: true, value: null }
  const value = Number(trimmed)
  if (!/^-?\d+(\.\d+)?$/.test(trimmed) || !Number.isFinite(value)) return { ok: false, error: `${label} must be a number.` }
  if (integer && !Number.isInteger(value)) return { ok: false, error: `${label} must be a whole number.` }
  if (min != null && value < min) return { ok: false, error: `${label} can’t be lower than ${min}.` }
  if (max != null && value > max) return { ok: false, error: `${label} can’t be higher than ${max}.` }
  return { ok: true, value }
}

export const numToText = (n: number | null | undefined) => (n == null ? '' : String(n))
