import type { AppData } from '../types'
import { validateAppData } from './validate'

/*
 * Cloud sync through a private (secret) GitHub Gist. The gist holds one file
 * with the whole AppData plus the time it was saved. The token never leaves
 * this browser except in requests to api.github.com.
 */

export const GIST_FILE = 'cadet-os-data.json'
const GIST_DESCRIPTION = 'CADET OS data (auto-sync)'
const API = 'https://api.github.com'
const CONFIG_KEY = 'cadet-os:sync'

export interface SyncConfig {
  token: string
  gistId: string
  login: string
  /** When local data last changed (ISO). */
  localChangedAt: string | null
  /** savedAt of the remote copy we last pushed or pulled (ISO). */
  remoteSeenAt: string | null
}

export interface RemoteCopy {
  savedAt: string
  data: AppData
}

export function loadConfig(): SyncConfig | null {
  try {
    const raw = window.localStorage.getItem(CONFIG_KEY)
    if (!raw) return null
    const c = JSON.parse(raw) as SyncConfig
    return c && typeof c.token === 'string' && typeof c.gistId === 'string' ? c : null
  } catch {
    return null
  }
}

export function saveConfig(config: SyncConfig | null) {
  try {
    if (config) window.localStorage.setItem(CONFIG_KEY, JSON.stringify(config))
    else window.localStorage.removeItem(CONFIG_KEY)
  } catch {
    // storage blocked; sync just won't survive a reload
  }
}

/**
 * Union of two data sets by item id. Used when the same data was edited in two
 * places, so nothing is lost: items only one side has are kept, and for items
 * both sides have, `prefer` wins.
 */
export function mergeData(prefer: AppData, other: AppData): AppData {
  const union = <T extends { id: string }>(a: T[], b: T[]): T[] => {
    const seen = new Set(a.map((x) => x.id))
    return [...a, ...b.filter((x) => !seen.has(x.id))]
  }
  return {
    ...prefer,
    tasks: union(prefer.tasks, other.tasks),
    attempts: union(prefer.attempts, other.attempts),
    sessions: union(prefer.sessions, other.sessions),
    journal: union(prefer.journal, other.journal),
    lab: union(prefer.lab, other.lab),
  }
}

export class SyncError extends Error {
  constructor(
    message: string,
    readonly auth = false,
  ) {
    super(message)
  }
}

async function gh<T>(token: string, path: string, init: RequestInit = {}): Promise<T> {
  let res: Response
  try {
    res = await fetch(`${API}${path}`, {
      ...init,
      headers: {
        Accept: 'application/vnd.github+json',
        Authorization: `Bearer ${token}`,
        'X-GitHub-Api-Version': '2022-11-28',
        ...(init.body ? { 'Content-Type': 'application/json' } : {}),
      },
    })
  } catch {
    throw new SyncError('No connection to GitHub.')
  }
  if (res.status === 401) throw new SyncError('GitHub rejected the token (expired or revoked).', true)
  if (res.status === 403 || res.status === 404) {
    throw new SyncError('The token has no access to gists. Create it with the “gist” scope.', true)
  }
  if (!res.ok) throw new SyncError(`GitHub error ${res.status}.`)
  return (await res.json()) as T
}

interface GistFile {
  content?: string
  truncated?: boolean
  raw_url?: string
}
interface Gist {
  id: string
  files: Record<string, GistFile | undefined>
}

export async function getLogin(token: string): Promise<string> {
  const user = await gh<{ login: string }>(token, '/user')
  return user.login
}

/** Finds the CADET OS gist on this account, if one was created before. */
export async function findGist(token: string): Promise<string | null> {
  for (let page = 1; page <= 10; page++) {
    const list = await gh<Gist[]>(token, `/gists?per_page=100&page=${page}`)
    const hit = list.find((g) => g.files[GIST_FILE])
    if (hit) return hit.id
    if (list.length < 100) return null
  }
  return null
}

const serialize = (data: AppData, savedAt: string) => JSON.stringify({ savedAt, data } satisfies RemoteCopy)

export async function createGist(token: string, data: AppData, savedAt: string): Promise<string> {
  const gist = await gh<Gist>(token, '/gists', {
    method: 'POST',
    body: JSON.stringify({
      description: GIST_DESCRIPTION,
      public: false,
      files: { [GIST_FILE]: { content: serialize(data, savedAt) } },
    }),
  })
  return gist.id
}

export async function pushGist(token: string, gistId: string, data: AppData, savedAt: string): Promise<void> {
  await gh<Gist>(token, `/gists/${gistId}`, {
    method: 'PATCH',
    body: JSON.stringify({ files: { [GIST_FILE]: { content: serialize(data, savedAt) } } }),
  })
}

export function parseRemote(text: string): RemoteCopy | null {
  try {
    const json = JSON.parse(text) as { savedAt?: unknown; data?: unknown }
    if (typeof json.savedAt !== 'string') return null
    const result = validateAppData(json.data)
    return result.ok ? { savedAt: json.savedAt, data: result.data } : null
  } catch {
    return null
  }
}

/** Returns the remote copy, or null if the gist has no usable data yet. */
export async function pullGist(token: string, gistId: string): Promise<RemoteCopy | null> {
  const gist = await gh<Gist>(token, `/gists/${gistId}`)
  const file = gist.files[GIST_FILE]
  if (!file) return null
  let text = file.content ?? ''
  if (file.truncated && file.raw_url) {
    try {
      text = await (await fetch(file.raw_url)).text()
    } catch {
      throw new SyncError('No connection to GitHub.')
    }
  }
  const copy = parseRemote(text)
  if (!copy) throw new SyncError('The data in the gist could not be read. Nothing was changed.')
  return copy
}
