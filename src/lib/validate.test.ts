import { describe, expect, it } from 'vitest'
import { createSeedData } from './seed'
import { parseImportText, validateAppData } from './validate'

describe('validateAppData', () => {
  it('round-trips the seed data', () => {
    const seed = createSeedData()
    const result = parseImportText(JSON.stringify(seed))
    expect(result).toEqual({ ok: true, data: seed })
  })

  it('rejects non-JSON text', () => {
    expect(parseImportText('not json')).toEqual({ ok: false, errors: ['The file is not valid JSON.'] })
  })

  it('rejects an unknown schema version', () => {
    const result = validateAppData({ ...createSeedData(), schemaVersion: 99 })
    expect(result.ok).toBe(false)
  })

  it('reports field-level problems', () => {
    const seed = createSeedData()
    const bad = {
      ...seed,
      attempts: [{ ...seed.attempts[0], sten: 14, date: '13/10/2026' }],
      tasks: [{ id: 't', date: '2026-10-14', title: '', category: 'flying' }],
    }
    const result = validateAppData(bad)
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.errors).toEqual(
        expect.arrayContaining([
          'tasks[0].title: must not be empty',
          'tasks[0].category: is not a known category',
          'attempts[0].date: must be a date like 2026-11-05',
          'attempts[0].sten: must be between 1 and 10',
        ]),
      )
    }
  })

  it('rejects raw scores above their maximum', () => {
    const seed = createSeedData()
    const result = validateAppData({ ...seed, attempts: [{ ...seed.attempts[0], rawScore: 60 }] })
    expect(result.ok).toBe(false)
  })
})
