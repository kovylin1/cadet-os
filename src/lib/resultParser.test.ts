import { describe, expect, it } from 'vitest'
import { parseResultText } from './resultParser'

describe('parseResultText', () => {
  it('reads a mathematics report', () => {
    const r = parseResultText(`Mathematics Test
      Date: 13/10/2026
      Your score: 88%
      Weighted marks: 44 / 50
      Sten score: 9`)
    expect(r.fields).toMatchObject({
      category: 'math',
      date: '2026-10-13',
      percentage: 88,
      sten: 9,
      rawScore: 44,
      maxScore: 50,
      rawUnit: 'weighted marks',
    })
  })

  it('reads a coordination report with time on target', () => {
    const r = parseResultText(`Coordination & Control
      Sten 5/10   Scaled score 200
      Time on target: 80.0 s
      Test duration: 180 seconds`)
    expect(r.fields).toMatchObject({
      category: 'coordination',
      sten: 5,
      scaledScore: 200,
      rawScore: 80,
      maxScore: 180,
      rawUnit: 's on target',
      durationMinutes: 3,
    })
    expect(r.fields.percentage).toBeUndefined()
  })

  it('handles "44/50 weighted marks" order, commas and month-name dates', () => {
    const r = parseResultText('Physics — 13 October 2026. 98 % · 49/50 weighted marks · sten: 10/10. Time taken 25 min')
    expect(r.fields).toMatchObject({
      category: 'physics',
      date: '2026-10-13',
      percentage: 98,
      sten: 10,
      rawScore: 49,
      maxScore: 50,
      durationMinutes: 25,
    })
  })

  it('does not mistake a sten "9/10" for a raw score', () => {
    const r = parseResultText('Sten 9/10')
    expect(r.fields.sten).toBe(9)
    expect(r.fields.rawScore).toBeUndefined()
  })

  it('returns nothing (rather than guessing) for unrelated text', () => {
    const r = parseResultText('Hello, this is a screenshot of a login page')
    expect(r.found).toEqual([])
  })

  it('ignores impossible values', () => {
    const r = parseResultText('Score 140% sten 14')
    expect(r.fields.percentage).toBeUndefined()
    expect(r.fields.sten).toBeUndefined()
  })
})
