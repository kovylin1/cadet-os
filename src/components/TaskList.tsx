import { useMemo, useState } from 'react'
import { AlertTriangle, Check, Clock, HeartPulse, Pencil, Trash2 } from 'lucide-react'
import clsx from 'clsx'
import type { Task } from '../types'
import { formatDay, todayKey } from '../lib/dates'
import { useActions, useData } from '../state/store'
import { useToast } from '../state/toast'
import { useCheckIn } from '../state/checkin'
import { TaskDialog } from './forms/TaskDialog'
import { Button } from './ui/Button'
import { ConfirmDialog } from './ui/Dialog'
import { CategoryChip } from './ui/Misc'

interface TaskListProps {
  tasks: Task[]
  showDate?: boolean
  label: string
}

export function TaskList({ tasks, showDate = false, label }: TaskListProps) {
  const { sessions } = useData()
  const actions = useActions()
  const toast = useToast()
  const [editing, setEditing] = useState<Task | null>(null)
  const [deleting, setDeleting] = useState<Task | null>(null)
  const openCheckIn = useCheckIn()

  const checkedIn = useMemo(() => new Set(sessions.map((s) => s.taskId).filter(Boolean)), [sessions])
  const today = todayKey()

  // Pending first, then completed — completed stay visible as history.
  const ordered = useMemo(
    () =>
      [...tasks].sort(
        (a, b) => Number(a.completed) - Number(b.completed) || a.date.localeCompare(b.date) || a.createdAt.localeCompare(b.createdAt),
      ),
    [tasks],
  )

  function toggle(task: Task) {
    const completed = !task.completed
    actions.setTaskCompleted(task.id, completed)
    if (completed && task.category !== 'rest' && !checkedIn.has(task.id)) {
      toast({
        message: `“${task.title}” complete.`,
        action: { label: 'Log check-in', onClick: () => openCheckIn(task.id) },
      })
    } else {
      toast({ message: completed ? `“${task.title}” complete.` : `“${task.title}” marked as not done.`, tone: completed ? 'success' : 'info' })
    }
  }

  return (
    <>
      <ul aria-label={label} className="flex flex-col divide-y divide-hairline">
        {ordered.map((task) => {
          const overdue = !task.completed && task.date < today
          return (
            <li key={task.id} className="group flex items-start gap-3 py-3 first:pt-0 last:pb-0">
              <label className="relative mt-0.5 flex size-11 shrink-0 cursor-pointer items-center justify-center sm:size-8">
                <input
                  type="checkbox"
                  checked={task.completed}
                  onChange={() => toggle(task)}
                  aria-label={`Done: ${task.title}`}
                  className="peer sr-only"
                />
                <span
                  aria-hidden
                  className={clsx(
                    'flex size-6 items-center justify-center rounded-[5px] border-2 transition-colors duration-200',
                    'peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-accent',
                    task.completed ? 'border-good bg-good text-accent-ink' : 'border-control hover:border-accent',
                  )}
                >
                  {task.completed && <Check size={16} strokeWidth={3} />}
                </span>
              </label>
              <div className="min-w-0 flex-1 pt-1 sm:pt-0.5">
                <p className={clsx('font-medium break-words', task.completed ? 'text-muted line-through decoration-muted/60' : 'text-ink')}>
                  {task.title}
                </p>
                <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-muted">
                  <CategoryChip id={task.category} short />
                  {showDate && <span>{formatDay(task.date, 'EEE d MMM')}</span>}
                  {task.plannedMinutes != null && (
                    <span className="inline-flex items-center gap-1">
                      <Clock size={13} aria-hidden />
                      <span className="num">{task.plannedMinutes}</span> min
                    </span>
                  )}
                  {overdue && (
                    <span className="inline-flex items-center gap-1 text-warn">
                      <AlertTriangle size={13} aria-hidden />
                      Overdue
                    </span>
                  )}
                  {task.completed && checkedIn.has(task.id) && (
                    <span className="inline-flex items-center gap-1">
                      <HeartPulse size={13} aria-hidden className="text-good" />
                      Checked in
                    </span>
                  )}
                </div>
                {task.notes && <p className="mt-1.5 text-sm whitespace-pre-line text-muted">{task.notes}</p>}
                {task.completed && task.category !== 'rest' && !checkedIn.has(task.id) && (
                  <button
                    type="button"
                    onClick={() => openCheckIn(task.id)}
                    className="mt-1.5 -ml-1 rounded-control px-1 py-0.5 text-sm text-accent underline-offset-2 hover:underline"
                  >
                    Log check-in
                  </button>
                )}
              </div>
              <div className="flex shrink-0 gap-1">
                <Button variant="ghost" size="icon-sm" onClick={() => setEditing(task)} aria-label={`Edit “${task.title}”`}>
                  <Pencil size={16} aria-hidden />
                </Button>
                <Button variant="ghost" size="icon-sm" onClick={() => setDeleting(task)} aria-label={`Delete “${task.title}”`}>
                  <Trash2 size={16} aria-hidden />
                </Button>
              </div>
            </li>
          )
        })}
      </ul>

      <TaskDialog open={editing != null} onClose={() => setEditing(null)} task={editing} defaultDate={editing?.date ?? today} />
      <ConfirmDialog
        open={deleting != null}
        title="Delete task?"
        message={
          <>
            “{deleting?.title}” will be removed from the calendar. A logged check-in, if any, is kept. This can’t be
            undone.
          </>
        }
        confirmLabel="Delete task"
        onCancel={() => setDeleting(null)}
        onConfirm={() => {
          if (deleting) {
            actions.deleteTask(deleting.id)
            toast({ message: 'Task deleted.', tone: 'info' })
          }
          setDeleting(null)
        }}
      />
    </>
  )
}
