import type { AppData } from '../types'
import { createSeedData } from './seed'
import { validateAppData } from './validate'

/*
 * Persistence boundary. The UI only talks to a DataStore, so swapping
 * LocalStorage for an authenticated API later means writing one new class —
 * the components and state layer stay as they are.
 */
export interface DataStore {
  load(): LoadResult
  save(data: AppData): SaveResult
}

export type LoadResult =
  | { status: 'loaded'; data: AppData }
  | { status: 'fresh'; data: AppData }
  /** Stored data exists but couldn't be read; the original is preserved under a backup key. */
  | { status: 'recovered'; data: AppData; backupKey: string }

export type SaveResult = { ok: true } | { ok: false; error: string }

const STORAGE_KEY = 'cadet-os:data'

export class LocalStorageStore implements DataStore {
  constructor(private key: string = STORAGE_KEY) {}

  load(): LoadResult {
    let raw: string | null = null
    try {
      raw = window.localStorage.getItem(this.key)
    } catch {
      return { status: 'fresh', data: createSeedData() }
    }
    if (raw === null) return { status: 'fresh', data: createSeedData() }

    try {
      const result = validateAppData(JSON.parse(raw))
      if (result.ok) return { status: 'loaded', data: result.data }
    } catch {
      // fall through to recovery
    }
    // Never silently throw away unreadable data — park it so it can be recovered by hand.
    const backupKey = `${this.key}:backup:${Date.now()}`
    try {
      window.localStorage.setItem(backupKey, raw)
    } catch {
      // storage full or blocked; nothing more we can do
    }
    return { status: 'recovered', data: createSeedData(), backupKey }
  }

  save(data: AppData): SaveResult {
    try {
      window.localStorage.setItem(this.key, JSON.stringify(data))
      return { ok: true }
    } catch (error) {
      const quota = error instanceof DOMException && error.name === 'QuotaExceededError'
      return {
        ok: false,
        error: quota
          ? 'Browser storage is full. Export your data, then free some space.'
          : 'Your browser blocked saving (private mode or storage disabled). Changes will be lost on refresh.',
      }
    }
  }
}
