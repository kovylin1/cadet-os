import { describe, expect, it } from 'vitest'
import { buildAiPrompt, dedupe, parseAiReply } from './aiBridge'
import { createSeedData } from './seed'

describe('buildAiPrompt', () => {
  it('includes the rules, the reply format and the current results', () => {
    const prompt = buildAiPrompt(createSeedData(), new Date('2026-10-14T09:00:00'))
    expect(prompt).toContain('2026-11-05')
    expect(prompt).toContain('"cadetos": 1')
    expect(prompt).toContain('Never invent scores')
    expect(prompt).toContain('Coordination & Control — attempt 2')
  })
})

describe('parseAiReply', () => {
  const reply = `Sure! Here is your plan:

\`\`\`json
{
  "cadetos": 1,
  "tasks": [
    { "date": "2026-10-15", "title": "Fuel & unit conversion drill", "category": "math", "plannedMinutes": 40, "notes": "lbs→kg, reserves" },
    { "date": "2026-10-16", "title": "Rest day", "category": "rest" }
  ],
  "journal": [
    { "date": "2026-10-14", "category": "coordination", "learned": "Small inputs beat big corrections." }
  ]
}
\`\`\`
Good luck!`

  it('extracts a fenced JSON block from surrounding chat text', () => {
    const r = parseAiReply(reply)
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.items.tasks).toHaveLength(2)
    expect(r.items.tasks[0]).toMatchObject({ title: 'Fuel & unit conversion drill', plannedMinutes: 40, completed: false })
    expect(r.items.tasks[0].id).toMatch(/^task_/)
    expect(r.items.journal[0].learned).toBe('Small inputs beat big corrections.')
    expect(r.items.attempts).toEqual([])
  })

  it('accepts bare JSON too', () => {
    const r = parseAiReply('{"cadetos":1,"tasks":[{"date":"2026-10-15","title":"x","category":"physics"}]}')
    expect(r.ok && r.items.tasks.length).toBe(1)
  })

  it('reports invalid items instead of importing them', () => {
    const r = parseAiReply('{"cadetos":1,"tasks":[{"date":"15/10/2026","title":"x","category":"flying"}]}')
    expect(r.ok).toBe(false)
    if (r.ok) return
    expect(r.errors.join(' ')).toMatch(/date/)
    expect(r.errors.join(' ')).toMatch(/category/)
  })

  it('rejects replies without the CADET OS block', () => {
    expect(parseAiReply('Here are some tips: sleep well.').ok).toBe(false)
  })

  it('drops items that already exist', () => {
    const data = createSeedData()
    const r = parseAiReply(
      JSON.stringify({ cadetos: 1, attempts: [{ ...data.attempts[0], id: undefined }], tasks: [] }),
    )
    expect(r.ok).toBe(true)
    if (!r.ok) return
    const { items, skipped } = dedupe(r.items, data)
    expect(items.attempts).toHaveLength(0)
    expect(skipped).toBe(1)
  })
})
