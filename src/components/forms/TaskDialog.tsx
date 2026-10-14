import { useState, type FormEvent } from 'react'
import type { CategoryId, Task } from '../../types'
import { CATEGORIES } from '../../lib/categories'
import { isDayKey } from '../../lib/dates'
import { numToText, parseOptionalNumber } from '../../lib/forms'
import { useActions } from '../../state/store'
import { useToast } from '../../state/toast'
import { Button } from '../ui/Button'
import { Dialog } from '../ui/Dialog'
import { Field, Input, Select, Textarea } from '../ui/Field'

interface TaskDialogProps {
  open: boolean
  onClose: () => void
  /** Present when editing. */
  task?: Task | null
  defaultDate: string
}

export function TaskDialog(props: TaskDialogProps) {
  // Remount the form whenever the dialog opens so fields reset cleanly.
  return (
    <Dialog
      open={props.open}
      onClose={props.onClose}
      title={props.task ? 'Edit task' : 'Add training task'}
      description={props.task ? undefined : 'Plan a session for a specific day.'}
    >
      {props.open && <TaskForm key={props.task?.id ?? props.defaultDate} {...props} />}
    </Dialog>
  )
}

function TaskForm({ onClose, task, defaultDate }: TaskDialogProps) {
  const actions = useActions()
  const toast = useToast()
  const [title, setTitle] = useState(task?.title ?? '')
  const [date, setDate] = useState(task?.date ?? defaultDate)
  const [cat, setCat] = useState<CategoryId>(task?.category ?? 'math')
  const [minutes, setMinutes] = useState(numToText(task?.plannedMinutes ?? (task ? null : 45)))
  const [notes, setNotes] = useState(task?.notes ?? '')
  const [errors, setErrors] = useState<Record<string, string>>({})

  function submit(e: FormEvent) {
    e.preventDefault()
    const next: Record<string, string> = {}
    if (!title.trim()) next.title = 'Give the task a short title, e.g. “Mental maths drill”.'
    if (!isDayKey(date)) next.date = 'Choose a date.'
    const mins = parseOptionalNumber(minutes, { min: 1, max: 600, integer: true, label: 'Planned duration' })
    if (!mins.ok) next.minutes = mins.error
    setErrors(next)
    if (Object.keys(next).length || !mins.ok) {
      requestAnimationFrame(() => document.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus())
      return
    }

    const input = { title: title.trim(), date, category: cat, plannedMinutes: mins.value, notes: notes.trim() }
    if (task) {
      actions.updateTask(task.id, input)
      toast({ message: 'Task updated.' })
    } else {
      actions.addTask(input)
      toast({ message: 'Task added to the calendar.' })
    }
    onClose()
  }

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-4">
      <Field label="Title" required error={errors.title}>
        {({ id, describedBy, invalid }) => (
          <Input
            id={id}
            aria-describedby={describedBy}
            invalid={invalid}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Speed-distance-time drill"
            maxLength={120}
            data-autofocus
          />
        )}
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Date" required error={errors.date}>
          {({ id, describedBy, invalid }) => (
            <Input id={id} type="date" aria-describedby={describedBy} invalid={invalid} value={date} onChange={(e) => setDate(e.target.value)} />
          )}
        </Field>
        <Field label="Planned duration (min)" error={errors.minutes} hint="Optional">
          {({ id, describedBy, invalid }) => (
            <Input
              id={id}
              inputMode="numeric"
              aria-describedby={describedBy}
              invalid={invalid}
              value={minutes}
              onChange={(e) => setMinutes(e.target.value)}
              className="num"
            />
          )}
        </Field>
      </div>
      <Field label="Category">
        {({ id }) => (
          <Select id={id} value={cat} onChange={(e) => setCat(e.target.value as CategoryId)}>
            {CATEGORIES.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </Select>
        )}
      </Field>
      <Field label="Notes" hint="Optional — focus points, resources, targets.">
        {({ id, describedBy }) => (
          <Textarea id={id} aria-describedby={describedBy} value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={2000} />
        )}
      </Field>
      <div className="flex justify-end gap-2 border-t border-hairline pt-4">
        <Button variant="ghost" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit" variant="primary">
          {task ? 'Save changes' : 'Add task'}
        </Button>
      </div>
    </form>
  )
}
