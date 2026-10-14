import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import type { AppData, Attempt, JournalEntry, Session, Settings, Task } from '../types'
import { newId } from '../lib/ids'
import { createEmptyData, createSeedData } from '../lib/seed'
import { LocalStorageStore, type DataStore } from '../lib/storage'
import { useToast } from './toast'

type NewTask = Omit<Task, 'id' | 'createdAt' | 'completed' | 'completedAt'>
type NewAttempt = Omit<Attempt, 'id' | 'createdAt'>
type NewSession = Omit<Session, 'id' | 'createdAt'>
type NewJournal = Omit<JournalEntry, 'id' | 'createdAt' | 'updatedAt'>

export interface Actions {
  addTask(input: NewTask): Task
  updateTask(id: string, patch: Partial<NewTask>): void
  setTaskCompleted(id: string, completed: boolean): void
  deleteTask(id: string): void

  addAttempt(input: NewAttempt): Attempt
  updateAttempt(id: string, patch: Partial<NewAttempt>): void
  deleteAttempt(id: string): void

  addSession(input: NewSession): Session
  updateSession(id: string, patch: Partial<NewSession>): void
  deleteSession(id: string): void

  addJournal(input: NewJournal): JournalEntry
  updateJournal(id: string, patch: Partial<NewJournal>): void
  deleteJournal(id: string): void

  /** Appends already-validated items (e.g. from the AI bridge). */
  mergeItems(items: { tasks: Task[]; journal: JournalEntry[]; attempts: Attempt[] }): void
  updateSettings(patch: Partial<Settings>): void
  replaceAll(data: AppData): void
  resetToSample(): void
  clearAll(): void
}

interface StoreValue {
  data: AppData
  actions: Actions
}

const StoreContext = createContext<StoreValue | null>(null)

const now = () => new Date().toISOString()

export function StoreProvider({ children, store }: { children: ReactNode; store?: DataStore }) {
  const storeRef = useRef<DataStore>(store ?? new LocalStorageStore())
  const toast = useToast()
  const [initial] = useState(() => storeRef.current.load())
  const [data, setData] = useState<AppData>(initial.data)
  const firstRender = useRef(true)

  useEffect(() => {
    if (initial.status === 'recovered') {
      toast({
        tone: 'error',
        message: `Saved data could not be read, so sample data was loaded. The original was kept in browser storage under "${initial.backupKey}".`,
      })
    }
  }, [initial, toast])

  // Persist after every change. The very first render is skipped so opening the
  // app never writes anything until the user actually changes something.
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false
      return
    }
    const result = storeRef.current.save(data)
    if (!result.ok) toast({ tone: 'error', message: result.error })
  }, [data, toast])

  const actions = useMemo<Actions>(() => {
    const patchList = <K extends 'tasks' | 'attempts' | 'sessions' | 'journal'>(
      key: K,
      fn: (list: AppData[K]) => AppData[K],
    ) => setData((d) => ({ ...d, [key]: fn(d[key]) }))

    return {
      addTask(input) {
        const task: Task = { ...input, id: newId('task'), createdAt: now(), completed: false, completedAt: null }
        patchList('tasks', (l) => [...l, task])
        return task
      },
      updateTask(id, patch) {
        patchList('tasks', (l) => l.map((t) => (t.id === id ? { ...t, ...patch } : t)))
      },
      setTaskCompleted(id, completed) {
        patchList('tasks', (l) =>
          l.map((t) => (t.id === id ? { ...t, completed, completedAt: completed ? now() : null } : t)),
        )
      },
      deleteTask(id) {
        setData((d) => ({
          ...d,
          tasks: d.tasks.filter((t) => t.id !== id),
          // Keep the check-in (it's still real training data) but detach it from the deleted task.
          sessions: d.sessions.map((s) => (s.taskId === id ? { ...s, taskId: null } : s)),
        }))
      },

      addAttempt(input) {
        const attempt: Attempt = { ...input, id: newId('att'), createdAt: now() }
        patchList('attempts', (l) => [...l, attempt])
        return attempt
      },
      updateAttempt(id, patch) {
        patchList('attempts', (l) => l.map((a) => (a.id === id ? { ...a, ...patch } : a)))
      },
      deleteAttempt(id) {
        patchList('attempts', (l) => l.filter((a) => a.id !== id))
      },

      addSession(input) {
        const session: Session = { ...input, id: newId('ses'), createdAt: now() }
        patchList('sessions', (l) => [...l, session])
        return session
      },
      updateSession(id, patch) {
        patchList('sessions', (l) => l.map((s) => (s.id === id ? { ...s, ...patch } : s)))
      },
      deleteSession(id) {
        patchList('sessions', (l) => l.filter((s) => s.id !== id))
      },

      addJournal(input) {
        const t = now()
        const entry: JournalEntry = { ...input, id: newId('jrn'), createdAt: t, updatedAt: t }
        patchList('journal', (l) => [...l, entry])
        return entry
      },
      updateJournal(id, patch) {
        patchList('journal', (l) => l.map((j) => (j.id === id ? { ...j, ...patch, updatedAt: now() } : j)))
      },
      deleteJournal(id) {
        patchList('journal', (l) => l.filter((j) => j.id !== id))
      },

      mergeItems(items) {
        setData((d) => ({
          ...d,
          tasks: [...d.tasks, ...items.tasks],
          journal: [...d.journal, ...items.journal],
          attempts: [...d.attempts, ...items.attempts],
        }))
      },
      updateSettings(patch) {
        setData((d) => ({ ...d, settings: { ...d.settings, ...patch } }))
      },
      replaceAll(next) {
        setData(next)
      },
      resetToSample() {
        setData(createSeedData())
      },
      clearAll() {
        setData((d) => createEmptyData(d.settings))
      },
    }
  }, [])

  const value = useMemo(() => ({ data, actions }), [data, actions])
  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
}

export function useStore(): StoreValue {
  const ctx = useContext(StoreContext)
  if (!ctx) throw new Error('useStore must be used inside StoreProvider')
  return ctx
}

export function useData() {
  return useStore().data
}

export function useActions() {
  return useStore().actions
}
