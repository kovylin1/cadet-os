import { describe, expect, it } from 'vitest'
import { createEmptyData, createSeedData } from './seed'
import { mergeData, parseRemote } from './sync'

describe('mergeData', () => {
  it('keeps items from both sides and prefers the first on id clashes', () => {
    const a = createEmptyData(createSeedData().settings)
    const b = createSeedData()
    const local = { ...a, attempts: [{ ...b.attempts[0], name: 'local edit' }] }
    const merged = mergeData(local, b)
    expect(merged.attempts).toHaveLength(b.attempts.length)
    expect(merged.attempts.find((x) => x.id === b.attempts[0].id)?.name).toBe('local edit')
    expect(merged.settings).toBe(local.settings)
  })
})

describe('parseRemote', () => {
  it('round-trips a saved copy', () => {
    const data = createSeedData()
    const copy = parseRemote(JSON.stringify({ savedAt: '2026-10-16T10:00:00.000Z', data }))
    expect(copy?.data.attempts).toHaveLength(data.attempts.length)
  })
  it('rejects garbage', () => {
    expect(parseRemote('{"savedAt":1}')).toBeNull()
    expect(parseRemote('nope')).toBeNull()
  })
})
