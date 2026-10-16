import { useState, type FormEvent } from 'react'
import { Cloud, CloudOff, ExternalLink, RefreshCw } from 'lucide-react'
import { useSync } from '../state/sync'
import { Button } from './ui/Button'
import { Card, CardHeader } from './ui/Card'
import { Field, Input } from './ui/Field'
import { Note } from './ui/Misc'

const TOKEN_URL = 'https://github.com/settings/tokens/new?scopes=gist&description=CADET%20OS%20sync'

const timeOf = (iso: string) => new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

export function SyncCard() {
  const sync = useSync()
  const [token, setToken] = useState('')
  const [connecting, setConnecting] = useState(false)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setConnecting(true)
    const ok = await sync.connect(token)
    setConnecting(false)
    if (ok) setToken('')
  }

  const connected = sync.login != null

  return (
    <Card aria-labelledby="sync-heading">
      <CardHeader
        id="sync-heading"
        title="Cloud sync"
        description="Saves everything to a private GitHub Gist automatically, so the same data opens on every device and browser."
      />
      <div className="flex flex-col gap-4 px-4 pt-4 pb-5 sm:px-5">
        {connected ? (
          <>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="flex items-center gap-2 text-sm" role="status">
                {sync.status === 'error' ? (
                  <CloudOff size={16} className="text-danger" aria-hidden />
                ) : (
                  <Cloud size={16} className="text-accent" aria-hidden />
                )}
                <span>
                  Connected as <span className="font-medium text-ink">{sync.login}</span> ·{' '}
                  {sync.status === 'syncing'
                    ? 'syncing…'
                    : sync.status === 'error'
                      ? 'not synced'
                      : sync.lastSyncedAt
                        ? `synced at ${timeOf(sync.lastSyncedAt)}`
                        : 'synced'}
                </span>
              </p>
              <div className="flex gap-2">
                <Button size="sm" onClick={sync.syncNow} disabled={sync.status === 'syncing'}>
                  <RefreshCw size={14} aria-hidden /> Sync now
                </Button>
                <Button size="sm" variant="ghost" onClick={sync.disconnect}>
                  Disconnect
                </Button>
              </div>
            </div>
            {sync.error && (
              <Note icon={CloudOff} tone="warn">
                {sync.error} Your data is still saved in this browser and will upload once sync works again.
              </Note>
            )}
          </>
        ) : (
          <form onSubmit={onSubmit} noValidate className="flex flex-col gap-3">
            <ol className="list-decimal space-y-1 pl-5 text-sm text-muted">
              <li>
                <a href={TOKEN_URL} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-accent underline">
                  Create a GitHub token <ExternalLink size={12} aria-hidden />
                </a>{' '}
                — the “gist” box is already ticked. Set expiration to “No expiration”, then press Generate.
              </li>
              <li>Paste it below and connect. Do the same once on each device.</li>
            </ol>
            <Field label="GitHub token" error={sync.error ?? undefined} hint="Stored only in this browser. It can only read and write your gists.">
              {({ id, describedBy, invalid }) => (
                <Input
                  id={id}
                  type="password"
                  autoComplete="off"
                  spellCheck={false}
                  aria-describedby={describedBy}
                  invalid={invalid}
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  placeholder="ghp_…"
                />
              )}
            </Field>
            <div className="flex justify-end">
              <Button type="submit" variant="primary" disabled={connecting || token.trim() === ''}>
                <Cloud size={16} aria-hidden /> {connecting ? 'Connecting…' : 'Connect sync'}
              </Button>
            </div>
          </form>
        )}
      </div>
    </Card>
  )
}
