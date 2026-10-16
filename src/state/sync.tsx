import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import type { AppData } from '../types'
import {
  SyncError,
  createGist,
  findGist,
  getLogin,
  loadConfig,
  mergeData,
  pullGist,
  pushGist,
  saveConfig,
  type SyncConfig,
} from '../lib/sync'
import { useActions, useData } from './store'
import { useToast } from './toast'

export type SyncStatus = 'off' | 'syncing' | 'synced' | 'error'

interface SyncValue {
  status: SyncStatus
  login: string | null
  lastSyncedAt: string | null
  error: string | null
  connect(token: string): Promise<boolean>
  disconnect(): void
  syncNow(): void
}

const SyncContext = createContext<SyncValue | null>(null)

const PUSH_DELAY_MS = 1500
const now = () => new Date().toISOString()

/** True when the data is only the built-in sample (nothing the user entered). */
const isUntouched = (d: AppData) =>
  [...d.tasks, ...d.attempts, ...d.sessions, ...d.journal, ...d.lab].every((x) => x.id.startsWith('seed_'))

/*
 * Keeps local data and the gist in step:
 * - every local change is pushed after a short pause;
 * - when the tab opens or comes back into view, the gist is checked and newer
 *   data is pulled in. If both sides changed, they are merged by id, so no
 *   entry is ever dropped.
 */
export function SyncProvider({ children }: { children: ReactNode }) {
  const data = useData()
  const actions = useActions()
  const toast = useToast()

  const configRef = useRef<SyncConfig | null>(loadConfig())
  const dataRef = useRef(data)
  dataRef.current = data
  /** Last data object that is already in step (initial load or received from the gist) — not a local edit. */
  const seenRef = useRef<AppData>(data)
  const pushTimer = useRef<number | undefined>(undefined)
  const busy = useRef(false)
  const dirtyRef = useRef(false)

  const [status, setStatus] = useState<SyncStatus>(configRef.current ? 'syncing' : 'off')
  const [login, setLogin] = useState<string | null>(configRef.current?.login ?? null)
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const updateConfig = (patch: Partial<SyncConfig>) => {
    if (!configRef.current) return
    configRef.current = { ...configRef.current, ...patch }
    saveConfig(configRef.current)
  }

  const fail = useCallback((e: unknown) => {
    const message = e instanceof SyncError ? e.message : 'Sync failed.'
    setError(message)
    setStatus('error')
  }, [])

  const ok = () => {
    setError(null)
    setStatus('synced')
    setLastSyncedAt(now())
  }

  const apply = (next: AppData) => {
    seenRef.current = next
    actions.replaceAll(next)
  }

  const push = useCallback(async () => {
    const config = configRef.current
    if (!config || busy.current) return
    busy.current = true
    setStatus('syncing')
    let pushed = false
    try {
      const savedAt = now()
      dirtyRef.current = false
      await pushGist(config.token, config.gistId, dataRef.current, savedAt)
      updateConfig({ remoteSeenAt: savedAt, localChangedAt: dirtyRef.current ? now() : null })
      pushed = true
      ok()
    } catch (e) {
      dirtyRef.current = true
      fail(e)
    } finally {
      busy.current = false
    }
    // Something changed while we were uploading. (After a failure we wait for the next edit or tab focus.)
    if (pushed && dirtyRef.current) schedulePush()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fail])

  const schedulePush = useCallback(() => {
    window.clearTimeout(pushTimer.current)
    pushTimer.current = window.setTimeout(() => void push(), PUSH_DELAY_MS)
  }, [push])

  const reconcile = useCallback(async () => {
    const config = configRef.current
    if (!config || busy.current) return
    busy.current = true
    setStatus('syncing')
    try {
      const remote = await pullGist(config.token, config.gistId)
      const localDirty = config.localChangedAt != null
      const remoteChanged = remote != null && remote.savedAt !== config.remoteSeenAt
      busy.current = false
      if (remote && remoteChanged && !localDirty) {
        apply(remote.data)
        updateConfig({ remoteSeenAt: remote.savedAt })
        ok()
      } else if (remote && remoteChanged && localDirty) {
        apply(mergeData(dataRef.current, remote.data))
        await push()
      } else if (!remote || localDirty) {
        await push()
      } else {
        ok()
      }
    } catch (e) {
      busy.current = false
      fail(e)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fail, push])

  // Local edits → mark dirty and push soon.
  useEffect(() => {
    if (seenRef.current === data) return
    seenRef.current = data
    if (!configRef.current) return
    dirtyRef.current = true
    if (!configRef.current.localChangedAt) updateConfig({ localChangedAt: now() })
    schedulePush()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, schedulePush])

  // Check the gist on open and whenever the tab comes back into view.
  useEffect(() => {
    void reconcile()
    const onVisible = () => {
      if (document.visibilityState === 'visible') void reconcile()
      else if (configRef.current?.localChangedAt) {
        window.clearTimeout(pushTimer.current)
        void push()
      }
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [reconcile, push])

  const connect = useCallback(
    async (rawToken: string) => {
      const token = rawToken.trim()
      if (!token) return false
      setStatus('syncing')
      setError(null)
      try {
        const name = await getLogin(token)
        const existing = await findGist(token)
        const local = dataRef.current
        let gistId: string
        let savedAt = now()
        if (existing) {
          gistId = existing
          const remote = await pullGist(token, existing)
          const next = !remote ? local : isUntouched(local) ? remote.data : mergeData(local, remote.data)
          apply(next)
          await pushGist(token, gistId, next, savedAt)
        } else {
          gistId = await createGist(token, local, savedAt)
        }
        configRef.current = { token, gistId, login: name, localChangedAt: null, remoteSeenAt: savedAt }
        saveConfig(configRef.current)
        setLogin(name)
        ok()
        toast({ message: existing ? 'Sync connected — your saved data was merged in.' : 'Sync connected.' })
        return true
      } catch (e) {
        if (!configRef.current) setStatus('off')
        setError(e instanceof SyncError ? e.message : 'Could not connect.')
        if (configRef.current) setStatus('error')
        return false
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [toast],
  )

  const disconnect = useCallback(() => {
    window.clearTimeout(pushTimer.current)
    configRef.current = null
    saveConfig(null)
    setLogin(null)
    setError(null)
    setStatus('off')
  }, [])

  const value = useMemo<SyncValue>(
    () => ({ status, login, lastSyncedAt, error, connect, disconnect, syncNow: () => void reconcile() }),
    [status, login, lastSyncedAt, error, connect, disconnect, reconcile],
  )
  return <SyncContext.Provider value={value}>{children}</SyncContext.Provider>
}

export function useSync(): SyncValue {
  const ctx = useContext(SyncContext)
  if (!ctx) throw new Error('useSync must be used inside SyncProvider')
  return ctx
}
