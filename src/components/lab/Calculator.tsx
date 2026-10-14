import { useState } from 'react'
import clsx from 'clsx'

/** Tiny arithmetic evaluator (no eval): numbers, + − × ÷, brackets. Returns null for invalid input. */
export function evaluate(expr: string): number | null {
  const tokens = expr.replace(/×/g, '*').replace(/÷/g, '/').replace(/−/g, '-').match(/\d+(?:\.\d+)?|[-+*/()]/g)
  if (!tokens || tokens.join('') !== expr.replace(/×/g, '*').replace(/÷/g, '/').replace(/−/g, '-').replace(/\s/g, '')) return null
  let i = 0
  const peek = () => tokens[i]
  const expression = (): number => {
    let v = term()
    while (peek() === '+' || peek() === '-') v = tokens[i++] === '+' ? v + term() : v - term()
    return v
  }
  const term = (): number => {
    let v = factor()
    while (peek() === '*' || peek() === '/') v = tokens[i++] === '*' ? v * factor() : v / factor()
    return v
  }
  const factor = (): number => {
    const t = tokens[i++]
    if (t === '-') return -factor()
    if (t === '(') {
      const v = expression()
      if (tokens[i++] !== ')') throw new Error('bracket')
      return v
    }
    const n = Number(t)
    if (Number.isNaN(n)) throw new Error('number')
    return n
  }
  try {
    const v = expression()
    return i === tokens.length && Number.isFinite(v) ? v : null
  } catch {
    return null
  }
}

const KEYS = ['7', '8', '9', '÷', '4', '5', '6', '×', '1', '2', '3', '−', '0', '.', '(', '+', ')', '⌫', 'C', '=']

export function Calculator() {
  const [expr, setExpr] = useState('')
  const [result, setResult] = useState<string | null>(null)

  function press(k: string) {
    if (k === 'C') {
      setExpr('')
      setResult(null)
    } else if (k === '⌫') setExpr((e) => e.slice(0, -1))
    else if (k === '=') {
      const v = evaluate(expr)
      if (v == null) setResult('Error')
      else {
        // Keep the result as the start of the next calculation.
        const s = String(Number(v.toPrecision(10)))
        setExpr(s)
        setResult(s)
      }
    } else {
      setExpr((e) => e + k)
      setResult(null)
    }
  }

  return (
    <section aria-label="Calculator" className="rounded-card border border-hairline bg-surface p-3">
      <output aria-live="polite" className="num mb-2 block min-h-14 rounded-control bg-well px-3 py-2 text-right">
        <span className="block truncate text-sm text-muted">{expr || '0'}</span>
        <span className="block text-lg text-ink">{result ?? ''}</span>
      </output>
      <div className="grid grid-cols-4 gap-1.5">
        {KEYS.map((k) => (
          <button
            key={k}
            type="button"
            onClick={() => press(k)}
            aria-label={k === '⌫' ? 'Delete' : k === 'C' ? 'Clear' : k === '−' ? 'minus' : undefined}
            className={clsx(
              'num h-10 rounded-control border border-hairline text-sm transition-colors duration-150',
              k === '=' ? 'bg-accent font-semibold text-accent-ink hover:bg-accent-hover' : 'bg-surface-raised text-ink hover:bg-hairline',
            )}
          >
            {k}
          </button>
        ))}
      </div>
    </section>
  )
}
