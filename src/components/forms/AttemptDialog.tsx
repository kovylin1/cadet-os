import { useState, type FormEvent } from 'react'
import { Info } from 'lucide-react'
import type { Attempt, CategoryId, Rating } from '../../types'
import { SCORABLE_CATEGORIES, category } from '../../lib/categories'
import { isDayKey, todayKey } from '../../lib/dates'
import { numToText, parseOptionalNumber } from '../../lib/forms'
import { useActions } from '../../state/store'
import { useToast } from '../../state/toast'
import { Button } from '../ui/Button'
import { Dialog } from '../ui/Dialog'
import { Field, Input, Select, Textarea } from '../ui/Field'
import { Note } from '../ui/Misc'
import { RatingInput } from '../ui/RatingInput'
import type { ParseResult } from '../../lib/resultParser'
import { ResultAutofill } from './ResultAutofill'

interface AttemptDialogProps {
  open: boolean
  onClose: () => void
  attempt?: Attempt | null
  defaultCategory?: CategoryId
  defaultDate?: string
}

export function AttemptDialog(props: AttemptDialogProps) {
  return (
    <Dialog
      open={props.open}
      onClose={props.onClose}
      title={props.attempt ? 'Edit result' : 'Record a result'}
      description="Fill only the scores your practice test reports. Each scale is kept separately."
      size="lg"
    >
      {props.open && <AttemptForm key={props.attempt?.id ?? 'new'} {...props} />}
    </Dialog>
  )
}

function AttemptForm({ onClose, attempt, defaultCategory, defaultDate }: AttemptDialogProps) {
  const actions = useActions()
  const toast = useToast()
  const initialCat = attempt?.category ?? (defaultCategory && category(defaultCategory).scorable ? defaultCategory : 'math')

  const [cat, setCat] = useState<CategoryId>(initialCat)
  const [name, setName] = useState(attempt?.name ?? '')
  const [date, setDate] = useState(attempt?.date ?? defaultDate ?? todayKey())
  const [percentage, setPercentage] = useState(numToText(attempt?.percentage))
  const [sten, setSten] = useState(numToText(attempt?.sten))
  const [scaled, setScaled] = useState(numToText(attempt?.scaledScore))
  const [raw, setRaw] = useState(numToText(attempt?.rawScore))
  const [max, setMax] = useState(numToText(attempt?.maxScore))
  const [unit, setUnit] = useState(attempt?.rawUnit ?? '')
  const [duration, setDuration] = useState(numToText(attempt?.durationMinutes))
  const [fatigue, setFatigue] = useState<Rating | null>(attempt?.fatigue ?? null)
  const [difficulty, setDifficulty] = useState<Rating | null>(attempt?.difficulty ?? null)
  const [notes, setNotes] = useState(attempt?.notes ?? '')
  const [lessons, setLessons] = useState(attempt?.lessons ?? '')
  const [errors, setErrors] = useState<Record<string, string>>({})

  const rawNum = parseOptionalNumber(raw, { min: 0, label: 'Raw score' })
  const maxNum = parseOptionalNumber(max, { min: 1, label: 'Maximum' })
  const rawShare =
    rawNum.ok && maxNum.ok && rawNum.value != null && maxNum.value != null && rawNum.value <= maxNum.value
      ? (rawNum.value / maxNum.value) * 100
      : null

  function applyParsed({ fields: f }: ParseResult) {
    const nextCat = f.category && category(f.category).scorable ? f.category : cat
    if (f.category && category(f.category).scorable) setCat(f.category)
    if (f.date) setDate(f.date)
    if (f.percentage != null) setPercentage(String(f.percentage))
    if (f.sten != null) setSten(String(f.sten))
    if (f.scaledScore != null) setScaled(String(f.scaledScore))
    if (f.rawScore != null) setRaw(String(f.rawScore))
    if (f.maxScore != null) setMax(String(f.maxScore))
    if (f.rawUnit) setUnit(f.rawUnit)
    if (f.durationMinutes != null) setDuration(String(f.durationMinutes))
    if (!name.trim()) setName(`${category(nextCat).label} practice test`)
    setErrors({})
  }

  function submit(e: FormEvent) {
    e.preventDefault()
    const next: Record<string, string> = {}
    const p = parseOptionalNumber(percentage, { min: 0, max: 100, label: 'Percentage' })
    const s = parseOptionalNumber(sten, { min: 1, max: 10, integer: true, label: 'Sten' })
    const sc = parseOptionalNumber(scaled, { min: 0, label: 'Scaled score' })
    const d = parseOptionalNumber(duration, { min: 0, max: 600, label: 'Duration' })
    if (!name.trim()) next.name = 'Name the assessment, e.g. “Mathematics practice test”.'
    if (!isDayKey(date)) next.date = 'Choose a date.'
    if (!p.ok) next.percentage = p.error
    if (!s.ok) next.sten = s.error
    if (!sc.ok) next.scaled = sc.error
    if (!rawNum.ok) next.raw = rawNum.error
    if (!maxNum.ok) next.max = maxNum.error
    if (!d.ok) next.duration = d.error
    if (rawNum.ok && maxNum.ok && rawNum.value != null && maxNum.value != null && rawNum.value > maxNum.value) {
      next.raw = 'Raw score can’t be higher than the maximum.'
    }
    if (rawNum.ok && rawNum.value == null && maxNum.ok && maxNum.value != null) {
      next.raw = 'Enter the raw score, or clear the maximum.'
    }
    const allEmpty = [p, s, sc, rawNum].every((r) => r.ok && r.value == null)
    if (allEmpty) next.scores = 'Enter at least one score — percentage, sten, scaled or raw.'

    setErrors(next)
    if (Object.keys(next).length) {
      requestAnimationFrame(() => document.querySelector<HTMLElement>('[aria-invalid="true"], [data-error-anchor]')?.focus())
      return
    }

    const val = <T,>(r: { ok: boolean; value?: T }) => (r.ok ? (r.value as T) : null)
    const input = {
      name: name.trim(),
      category: cat,
      date,
      percentage: val<number | null>(p),
      sten: val<number | null>(s),
      scaledScore: val<number | null>(sc),
      rawScore: val<number | null>(rawNum),
      maxScore: val<number | null>(maxNum),
      rawUnit: rawNum.ok && rawNum.value != null ? unit.replace(/\|/g, '/').trim() || 'marks' : '',
      durationMinutes: val<number | null>(d),
      fatigue,
      difficulty,
      notes: notes.trim(),
      lessons: lessons.trim(),
    }
    if (attempt) {
      actions.updateAttempt(attempt.id, input)
      toast({ message: 'Result updated.' })
    } else {
      actions.addAttempt(input)
      toast({ message: `${category(cat).short} result saved. Charts updated.` })
    }
    onClose()
  }

  const numberField = (
    label: string,
    value: string,
    set: (v: string) => void,
    errorKey: string,
    hint?: string,
    placeholder?: string,
  ) => (
    <Field label={label} error={errors[errorKey]} hint={hint}>
      {({ id, describedBy, invalid }) => (
        <Input
          id={id}
          inputMode="decimal"
          aria-describedby={describedBy}
          invalid={invalid}
          value={value}
          placeholder={placeholder}
          onChange={(e) => set(e.target.value)}
          className="num"
        />
      )}
    </Field>
  )

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-5">
      {!attempt && <ResultAutofill onParsed={applyParsed} />}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Category" required>
          {({ id }) => (
            <Select id={id} value={cat} onChange={(e) => setCat(e.target.value as CategoryId)}>
              {SCORABLE_CATEGORIES.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </Select>
          )}
        </Field>
        <Field label="Date" required error={errors.date}>
          {({ id, describedBy, invalid }) => (
            <Input id={id} type="date" aria-describedby={describedBy} invalid={invalid} value={date} onChange={(e) => setDate(e.target.value)} />
          )}
        </Field>
      </div>
      <Field label="Assessment name" required error={errors.name}>
        {({ id, describedBy, invalid }) => (
          <Input
            id={id}
            aria-describedby={describedBy}
            invalid={invalid}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={`e.g. ${category(cat).label} practice test`}
            maxLength={120}
            data-autofocus
          />
        )}
      </Field>

      <fieldset className="flex flex-col gap-4 rounded-card border border-hairline p-4" aria-describedby={errors.scores ? 'scores-error' : undefined}>
        <legend className="px-1 text-sm font-medium">Scores</legend>
        {errors.scores && (
          <p id="scores-error" data-error-anchor tabIndex={-1} className="text-sm text-danger">
            {errors.scores}
          </p>
        )}
        <div className="grid gap-4 sm:grid-cols-3">
          {numberField('Percentage (%)', percentage, setPercentage, 'percentage', '0–100')}
          {numberField('Sten', sten, setSten, 'sten', 'Whole number 1–10')}
          {numberField('Scaled score', scaled, setScaled, 'scaled', 'As reported by the test')}
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          {numberField('Raw score', raw, setRaw, 'raw', rawShare != null ? `= ${rawShare.toFixed(1)}% of maximum` : undefined)}
          {numberField('Maximum possible', max, setMax, 'max')}
          <Field label="Raw unit" hint="e.g. marks, s on target">
            {({ id, describedBy }) => (
              <Input id={id} aria-describedby={describedBy} value={unit} onChange={(e) => setUnit(e.target.value)} placeholder="marks" maxLength={30} />
            )}
          </Field>
        </div>
        <Note icon={Info}>
          Raw scores are only compared with attempts that use the same unit and maximum. Practice scores show your
          progress — they don’t predict the airline’s selection outcome.
        </Note>
      </fieldset>

      <div className="grid gap-5 sm:grid-cols-2">
        <RatingInput label="Mental fatigue" anchors={['Fresh', 'Exhausted']} value={fatigue} onChange={setFatigue} optional />
        <RatingInput label="Difficulty" anchors={['Easy', 'Very hard']} value={difficulty} onChange={setDifficulty} optional />
      </div>
      <div className="sm:w-1/2 sm:pr-2">
        {numberField('Duration (min)', duration, setDuration, 'duration', 'Optional')}
      </div>
      <Field label="Notes and mistakes">
        {({ id }) => <Textarea id={id} value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={4000} />}
      </Field>
      <Field label="Lessons learned">
        {({ id }) => <Textarea id={id} value={lessons} onChange={(e) => setLessons(e.target.value)} maxLength={4000} />}
      </Field>
      <div className="flex justify-end gap-2 border-t border-hairline pt-4">
        <Button variant="ghost" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit" variant="primary">
          {attempt ? 'Save changes' : 'Save result'}
        </Button>
      </div>
    </form>
  )
}
