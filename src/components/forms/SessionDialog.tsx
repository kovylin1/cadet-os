import { useState, type FormEvent } from 'react'
import type { CategoryId, Rating, Session, Task } from '../../types'
import { CATEGORIES } from '../../lib/categories'
import { isDayKey, todayKey } from '../../lib/dates'
import { numToText, parseOptionalNumber } from '../../lib/forms'
import { useActions } from '../../state/store'
import { useToast } from '../../state/toast'
import { Button } from '../ui/Button'
import { Dialog } from '../ui/Dialog'
import { Field, Input, Select, Textarea } from '../ui/Field'
import { RatingInput } from '../ui/RatingInput'

interface SessionDialogProps {
  open: boolean
  onClose: () => void
  session?: Session | null
  /** Pre-fill from a task that was just completed. */
  fromTask?: Task | null
}

export function SessionDialog(props: SessionDialogProps) {
  return (
    <Dialog
      open={props.open}
      onClose={props.onClose}
      title={props.session ? 'Edit check-in' : 'How did the session feel?'}
      description={
        props.fromTask && !props.session
          ? `Check-in for “${props.fromTask.title}”. Takes ten seconds.`
          : 'Energy and focus ratings help you spot how fatigue affects results.'
      }
    >
      {props.open && <SessionForm key={props.session?.id ?? props.fromTask?.id ?? 'new'} {...props} />}
    </Dialog>
  )
}

function SessionForm({ onClose, session, fromTask }: SessionDialogProps) {
  const actions = useActions()
  const toast = useToast()
  const [date, setDate] = useState(session?.date ?? fromTask?.date ?? todayKey())
  const [cat, setCat] = useState<CategoryId | ''>(session?.category ?? fromTask?.category ?? '')
  const [duration, setDuration] = useState(numToText(session?.durationMinutes ?? fromTask?.plannedMinutes ?? null))
  const [before, setBefore] = useState<Rating | null>(session?.energyBefore ?? null)
  const [after, setAfter] = useState<Rating | null>(session?.energyAfter ?? null)
  const [focus, setFocus] = useState<Rating | null>(session?.concentration ?? null)
  const [notes, setNotes] = useState(session?.notes ?? '')
  const [errors, setErrors] = useState<Record<string, string>>({})

  function submit(e: FormEvent) {
    e.preventDefault()
    const next: Record<string, string> = {}
    const d = parseOptionalNumber(duration, { min: 1, max: 600, integer: true, label: 'Duration' })
    if (!isDayKey(date)) next.date = 'Choose a date.'
    if (!d.ok) next.duration = d.error
    else if (d.value == null) next.duration = 'Enter how many minutes you trained.'
    if (before == null) next.before = 'Pick a rating from 1 to 5.'
    if (after == null) next.after = 'Pick a rating from 1 to 5.'
    if (focus == null) next.focus = 'Pick a rating from 1 to 5.'
    setErrors(next)
    if (Object.keys(next).length || !d.ok || d.value == null || !before || !after || !focus) {
      requestAnimationFrame(() =>
        document.querySelector<HTMLElement>('dialog[open] fieldset[aria-describedby] input, dialog[open] [aria-invalid="true"]')?.focus(),
      )
      return
    }

    const input = {
      date,
      category: cat || null,
      taskId: session?.taskId ?? fromTask?.id ?? null,
      durationMinutes: d.value,
      energyBefore: before,
      energyAfter: after,
      concentration: focus,
      notes: notes.trim(),
    }
    if (session) {
      actions.updateSession(session.id, input)
      toast({ message: 'Check-in updated.' })
    } else {
      actions.addSession(input)
      toast({ message: 'Check-in logged.' })
    }
    onClose()
  }

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-5">
      <RatingInput label="Mental energy before" anchors={['Drained', 'Fresh']} value={before} onChange={setBefore} required error={errors.before} />
      <RatingInput label="Mental energy after" anchors={['Drained', 'Fresh']} value={after} onChange={setAfter} required error={errors.after} />
      <RatingInput label="Concentration" anchors={['Scattered', 'Locked in']} value={focus} onChange={setFocus} required error={errors.focus} />
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Duration (min)" required error={errors.duration}>
          {({ id, describedBy, invalid }) => (
            <Input id={id} inputMode="numeric" aria-describedby={describedBy} invalid={invalid} value={duration} onChange={(e) => setDuration(e.target.value)} className="num" />
          )}
        </Field>
        <Field label="Date" required error={errors.date}>
          {({ id, describedBy, invalid }) => (
            <Input id={id} type="date" aria-describedby={describedBy} invalid={invalid} value={date} onChange={(e) => setDate(e.target.value)} />
          )}
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
      <Field label="Notes" hint="Optional — sleep, time of day, anything that stood out.">
        {({ id, describedBy }) => (
          <Textarea id={id} aria-describedby={describedBy} value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} maxLength={2000} />
        )}
      </Field>
      <div className="flex justify-end gap-2 border-t border-hairline pt-4">
        <Button variant="ghost" onClick={onClose}>
          {session ? 'Cancel' : 'Skip'}
        </Button>
        <Button type="submit" variant="primary">
          {session ? 'Save changes' : 'Log check-in'}
        </Button>
      </div>
    </form>
  )
}
