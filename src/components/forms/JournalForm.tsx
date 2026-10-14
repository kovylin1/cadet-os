import { useState, type FormEvent } from 'react'
import type { CategoryId, JournalEntry } from '../../types'
import { CATEGORIES } from '../../lib/categories'
import { isDayKey, todayKey } from '../../lib/dates'
import { useActions } from '../../state/store'
import { useToast } from '../../state/toast'
import { Button } from '../ui/Button'
import { Field, Input, Select, Textarea } from '../ui/Field'

export const JOURNAL_PROMPTS = [
  { key: 'wentWell', label: 'What went well' },
  { key: 'difficult', label: 'What was difficult' },
  { key: 'learned', label: 'What I learned' },
  { key: 'changeNext', label: 'What to change next time' },
] as const

type PromptKey = (typeof JOURNAL_PROMPTS)[number]['key']

interface JournalFormProps {
  entry?: JournalEntry | null
  defaultCategory?: CategoryId | null
  onDone: () => void
  onCancel?: () => void
}

export function JournalForm({ entry, defaultCategory, onDone, onCancel }: JournalFormProps) {
  const actions = useActions()
  const toast = useToast()
  const [date, setDate] = useState(entry?.date ?? todayKey())
  const [cat, setCat] = useState<CategoryId | ''>(entry?.category ?? defaultCategory ?? '')
  const [text, setText] = useState<Record<PromptKey, string>>({
    wentWell: entry?.wentWell ?? '',
    difficult: entry?.difficult ?? '',
    learned: entry?.learned ?? '',
    changeNext: entry?.changeNext ?? '',
  })
  const [error, setError] = useState<string | null>(null)

  function submit(e: FormEvent) {
    e.preventDefault()
    if (!isDayKey(date)) return setError('Choose a date.')
    const trimmed = Object.fromEntries(JOURNAL_PROMPTS.map((p) => [p.key, text[p.key].trim()])) as Record<PromptKey, string>
    if (Object.values(trimmed).every((v) => v === '')) return setError('Write something in at least one of the four prompts.')
    setError(null)
    const input = { date, category: cat || null, ...trimmed }
    if (entry) {
      actions.updateJournal(entry.id, input)
      toast({ message: 'Journal entry updated.' })
    } else {
      actions.addJournal(input)
      toast({ message: 'Journal entry saved.' })
      setText({ wentWell: '', difficult: '', learned: '', changeNext: '' })
    }
    onDone()
  }

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Date" required>
          {({ id }) => <Input id={id} type="date" value={date} onChange={(e) => setDate(e.target.value)} />}
        </Field>
        <Field label="Category">
          {({ id }) => (
            <Select id={id} value={cat} onChange={(e) => setCat(e.target.value as CategoryId | '')}>
              <option value="">General</option>
              {CATEGORIES.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </Select>
          )}
        </Field>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {JOURNAL_PROMPTS.map((p) => (
          <Field key={p.key} label={p.label}>
            {({ id }) => (
              <Textarea
                id={id}
                rows={3}
                value={text[p.key]}
                onChange={(e) => setText((t) => ({ ...t, [p.key]: e.target.value }))}
                maxLength={4000}
              />
            )}
          </Field>
        ))}
      </div>
      {error && (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}
      <div className="flex justify-end gap-2">
        {onCancel && (
          <Button variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
        )}
        <Button type="submit" variant="primary">
          {entry ? 'Save changes' : 'Save entry'}
        </Button>
      </div>
    </form>
  )
}
