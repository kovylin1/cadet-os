import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react'
import { SessionDialog } from '../components/forms/SessionDialog'
import { useData } from './store'
import { useToast } from './toast'

const CheckInContext = createContext<((taskId: string) => void) | null>(null)

/*
 * One app-level check-in dialog. A toast action can outlive the list that
 * created it (route change, different day selected), so the dialog can't live
 * inside TaskList. The task is re-read at open time to avoid stale or duplicate check-ins.
 */
export function CheckInProvider({ children }: { children: ReactNode }) {
  const { tasks, sessions } = useData()
  const toast = useToast()
  const [taskId, setTaskId] = useState<string | null>(null)
  const task = taskId ? tasks.find((t) => t.id === taskId) ?? null : null
  // A toast action fires long after its closure was made; always check against the latest data.
  const latest = useRef({ tasks, sessions })
  latest.current = { tasks, sessions }

  const open = useCallback(
    (id: string) => {
      const { tasks, sessions } = latest.current
      const current = tasks.find((t) => t.id === id)
      if (!current || !current.completed) {
        toast({ tone: 'info', message: 'That task is no longer marked complete.' })
        return
      }
      if (sessions.some((s) => s.taskId === id)) {
        toast({ tone: 'info', message: 'A check-in is already logged for that task.' })
        return
      }
      setTaskId(id)
    },
    [toast],
  )

  return (
    <CheckInContext.Provider value={open}>
      {children}
      <SessionDialog open={task != null} onClose={() => setTaskId(null)} fromTask={task} />
    </CheckInContext.Provider>
  )
}

export function useCheckIn() {
  const ctx = useContext(CheckInContext)
  if (!ctx) throw new Error('useCheckIn must be used inside CheckInProvider')
  return ctx
}
