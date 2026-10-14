import { describe, expect, it } from 'vitest'
import type { Attempt, AppData, Session, Task } from '../types'
import {
  availableScales,
  formatValue,
  primaryScale,
  rawScaleKey,
  scaleStats,
  trainingSummary,
  valueOn,
} from './metrics'
import { createSeedData } from './seed'

function attempt(partial: Partial<Attempt>): Attempt {
  return {
    id: Math.random().toString(36),
    name: 'Test',
    category: 'math',
    date: '2026-10-01',
    rawScore: null,
    maxScore: null,
    rawUnit: '',
    percentage: null,
    sten: null,
    scaledScore: null,
    durationMinutes: null,
    fatigue: null,
    difficulty: null,
    notes: '',
    lessons: '',
    createdAt: '2026-10-01T10:00:00.000Z',
    ...partial,
  }
}

describe('scales', () => {
  it('keeps raw scores with different units or maximums on separate scales', () => {
    const a = attempt({ rawScore: 44, maxScore: 50, rawUnit: 'marks' })
    const b = attempt({ rawScore: 70, maxScore: 180, rawUnit: 's on target' })
    expect(availableScales([a, b])).toEqual([rawScaleKey('marks', 50), rawScaleKey('s on target', 180)])
  })

  it('orders scales percentage > sten > scaled > raw', () => {
    const a = attempt({ rawScore: 44, maxScore: 50, rawUnit: 'marks', sten: 9, percentage: 88, scaledScore: 120 })
    expect(availableScales([a])).toEqual(['percentage', 'sten', 'scaled', rawScaleKey('marks', 50)])
    expect(primaryScale(a)).toBe('percentage')
  })

  it('returns null when an attempt has no value on a scale', () => {
    expect(valueOn(attempt({ sten: 4 }), 'percentage')).toBeNull()
    expect(valueOn(attempt({ sten: 4 }), 'sten')).toBe(4)
  })

  it('formats values with their unit', () => {
    expect(formatValue(88, 'percentage')).toBe('88%')
    expect(formatValue(9, 'sten')).toBe('9/10')
    expect(formatValue(69.6, rawScaleKey('s on target', 180))).toBe('69.6/180 s on target')
  })
})

describe('scaleStats', () => {
  const attempts = [
    attempt({ date: '2026-10-13', sten: 4, createdAt: '2026-10-13T09:00:00Z' }),
    attempt({ date: '2026-10-13', sten: 5, createdAt: '2026-10-13T10:00:00Z' }),
    attempt({ date: '2026-10-15', sten: 7, createdAt: '2026-10-15T10:00:00Z' }),
    attempt({ date: '2026-10-16', percentage: 50 }),
  ]

  it('only uses attempts that have a value on the requested scale', () => {
    const stats = scaleStats(attempts, 'sten')!
    expect(stats.count).toBe(3)
    expect(stats.first.value).toBe(4)
    expect(stats.latest.value).toBe(7)
    expect(stats.best.value).toBe(7)
    expect(stats.average).toBeCloseTo(16 / 3)
    expect(stats.changeFromPrevious).toBe(2)
    expect(stats.firstToLatest).toBe(3)
    expect(stats.trend).toBe('improving')
  })

  it('orders same-day attempts by creation time', () => {
    const stats = scaleStats(attempts.slice(0, 2).reverse(), 'sten')!
    expect(stats.latest.value).toBe(5)
  })

  it('does not call a trend with fewer than three attempts', () => {
    const stats = scaleStats(attempts.slice(0, 2), 'sten')!
    expect(stats.trend).toBeNull()
    expect(stats.changeFromPrevious).toBe(1)
  })

  it('returns null for an empty scale', () => {
    expect(scaleStats(attempts, 'scaled')).toBeNull()
  })

  it('reports a steady trend for flat results', () => {
    const flat = [1, 2, 3].map((d) => attempt({ date: `2026-10-0${d}`, percentage: 80 }))
    expect(scaleStats(flat, 'percentage')!.trend).toBe('steady')
  })
})

describe('trainingSummary', () => {
  const base = createSeedData()
  const task = (p: Partial<Task>): Task => ({
    id: Math.random().toString(36),
    date: '2026-10-14',
    title: 'x',
    category: 'math',
    plannedMinutes: 30,
    notes: '',
    completed: true,
    completedAt: '2026-10-14T10:00:00Z',
    createdAt: '2026-10-14T09:00:00Z',
    ...p,
  })
  const session = (p: Partial<Session>): Session => ({
    id: Math.random().toString(36),
    date: '2026-10-14',
    taskId: null,
    category: null,
    energyBefore: 4,
    energyAfter: 3,
    concentration: 4,
    durationMinutes: 45,
    notes: '',
    createdAt: '2026-10-14T09:00:00Z',
    ...p,
  })

  it('counts completed non-rest tasks and standalone sessions without double counting', () => {
    const t = task({ id: 't1' })
    const data: AppData = {
      ...base,
      tasks: [t, task({ category: 'rest', plannedMinutes: 60 }), task({ completed: false })],
      sessions: [session({ taskId: 't1', durationMinutes: 40 }), session({})],
    }
    const summary = trainingSummary(data, new Date('2026-10-14T12:00:00'))
    expect(summary.sessions).toBe(2)
    // linked session replaces the planned 30 min with the actual 40; plus standalone 45
    expect(summary.minutes).toBe(85)
  })

  it('keeps a streak alive when today has no activity yet', () => {
    const data: AppData = {
      ...base,
      attempts: [],
      tasks: [task({ date: '2026-10-12' }), task({ date: '2026-10-13', category: 'rest' })],
      sessions: [],
    }
    expect(trainingSummary(data, new Date('2026-10-14T08:00:00')).streak).toBe(2)
    expect(trainingSummary(data, new Date('2026-10-16T08:00:00')).streak).toBe(0)
  })
})
