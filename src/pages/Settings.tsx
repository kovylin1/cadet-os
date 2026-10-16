import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from 'react'
import { Download, RotateCcw, ShieldCheck, Trash2, Upload } from 'lucide-react'
import type { AppData } from '../types'
import { isDayKey, todayKey } from '../lib/dates'
import { DEFAULT_ASSESSMENT_DATE } from '../lib/seed'
import { parseImportText } from '../lib/validate'
import { useActions, useData } from '../state/store'
import { useToast } from '../state/toast'
import { PageHeader } from '../components/layout/AppShell'
import { Button } from '../components/ui/Button'
import { Card, CardHeader } from '../components/ui/Card'
import { ConfirmDialog, Dialog } from '../components/ui/Dialog'
import { Field, Input, Select } from '../components/ui/Field'
import { Note } from '../components/ui/Misc'
import { AiBridgeButton } from '../components/AiBridge'
import { SyncCard } from '../components/SyncCard'
import { useSync } from '../state/sync'

type Pending = { kind: 'reset' } | { kind: 'clear' }

export function Settings() {
  const data = useData()
  const actions = useActions()
  const toast = useToast()
  const fileRef = useRef<HTMLInputElement>(null)
  const synced = useSync().login != null

  const [callsign, setCallsign] = useState(data.settings.callsign)
  const [assessmentDate, setAssessmentDate] = useState(data.settings.assessmentDate)
  const [weekStartsOn, setWeekStartsOn] = useState(String(data.settings.weekStartsOn))
  const [dateError, setDateError] = useState<string | undefined>()

  // Keep the form in step when settings change elsewhere (import, restore sample).
  useEffect(() => {
    setCallsign(data.settings.callsign)
    setAssessmentDate(data.settings.assessmentDate)
    setWeekStartsOn(String(data.settings.weekStartsOn))
  }, [data.settings])

  const [confirm, setConfirm] = useState<Pending | null>(null)
  const [importPreview, setImportPreview] = useState<{ data: AppData; fileName: string } | null>(null)
  const [importErrors, setImportErrors] = useState<string[] | null>(null)

  const dirty =
    callsign !== data.settings.callsign ||
    assessmentDate !== data.settings.assessmentDate ||
    weekStartsOn !== String(data.settings.weekStartsOn)

  function savePrefs(e: FormEvent) {
    e.preventDefault()
    if (!dirty) return toast({ message: 'No changes to save.', tone: 'info' })
    if (!isDayKey(assessmentDate)) {
      setDateError('Choose the assessment date.')
      return
    }
    setDateError(undefined)
    actions.updateSettings({ callsign: callsign.trim().slice(0, 40), assessmentDate, weekStartsOn: weekStartsOn === '0' ? 0 : 1 })
    toast({ message: 'Preferences saved.' })
  }

  function exportData() {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `cadet-os-backup-${todayKey()}.json`
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
    toast({ message: 'Backup downloaded.' })
  }

  async function onFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    if (file.size > 5 * 1024 * 1024) {
      setImportErrors(['The file is larger than 5 MB — that doesn’t look like a CADET OS backup.'])
      return
    }
    const result = parseImportText(await file.text())
    if (result.ok) setImportPreview({ data: result.data, fileName: file.name })
    else setImportErrors(result.errors)
  }

  const counts = (d: AppData) =>
    `${d.tasks.length} tasks, ${d.attempts.length} results, ${d.sessions.length} check-ins, ${d.journal.length} journal entries`

  return (
    <>
      <PageHeader title="Settings" description="A few preferences, and full control over your data." />

      <div className="grid max-w-3xl gap-6">
        <Card aria-labelledby="prefs-heading">
          <CardHeader id="prefs-heading" title="Preferences" />
          <form onSubmit={savePrefs} noValidate className="flex flex-col gap-4 px-4 pt-4 pb-5 sm:px-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Name or callsign" hint="Used in the greeting. Optional.">
                {({ id, describedBy }) => (
                  <Input id={id} aria-describedby={describedBy} value={callsign} onChange={(e) => setCallsign(e.target.value)} maxLength={40} autoComplete="nickname" />
                )}
              </Field>
              <Field
                label="Assessment date"
                required
                error={dateError}
                hint={assessmentDate !== DEFAULT_ASSESSMENT_DATE ? undefined : 'Air Astana Ab-Initio: 5 November 2026'}
              >
                {({ id, describedBy, invalid }) => (
                  <Input id={id} type="date" aria-describedby={describedBy} invalid={invalid} value={assessmentDate} onChange={(e) => setAssessmentDate(e.target.value)} />
                )}
              </Field>
              <Field label="Week starts on">
                {({ id }) => (
                  <Select id={id} value={weekStartsOn} onChange={(e) => setWeekStartsOn(e.target.value)}>
                    <option value="1">Monday</option>
                    <option value="0">Sunday</option>
                  </Select>
                )}
              </Field>
            </div>
            <div className="flex justify-end">
              <Button type="submit" variant="primary" aria-disabled={!dirty || undefined}>
                Save preferences
              </Button>
            </div>
          </form>
        </Card>

        <Card aria-labelledby="ai-heading">
          <CardHeader
            id="ai-heading"
            title="AI assistant"
            description="Let ChatGPT, Claude or another AI plan sessions, write notes or read result screenshots. You copy your context to it and paste its reply back; nothing is sent automatically."
          />
          <div className="px-4 pt-4 pb-5 sm:px-5">
            <AiBridgeButton />
          </div>
        </Card>

        <SyncCard />

        <Card aria-labelledby="data-heading">
          <CardHeader id="data-heading" title="Your data" description={`Currently stored: ${counts(data)}.`} />
          <div className="flex flex-col gap-5 px-4 pt-4 pb-5 sm:px-5">
            <Note icon={ShieldCheck}>
              {synced
                ? 'Saved in this browser and synced to your private GitHub Gist.'
                : 'Everything stays in this browser on this device until you turn on cloud sync above. Clearing browser data will erase it — export a backup now and then.'}
            </Note>

            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h3 className="font-medium">Export</h3>
                <p className="text-sm text-muted">Download everything as a JSON file.</p>
              </div>
              <Button onClick={exportData}>
                <Download size={16} aria-hidden /> Export JSON
              </Button>
            </div>

            <div className="flex flex-col gap-4 border-t border-hairline pt-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h3 className="font-medium">Import</h3>
                <p className="text-sm text-muted">Restore from a CADET OS backup. It’s checked before anything changes.</p>
              </div>
              <Button onClick={() => fileRef.current?.click()}>
                <Upload size={16} aria-hidden /> Import JSON
              </Button>
              <input ref={fileRef} type="file" accept="application/json,.json" onChange={onFile} className="sr-only" tabIndex={-1} aria-hidden />
            </div>

            <div className="flex flex-col gap-4 border-t border-hairline pt-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h3 className="font-medium">Restore sample data</h3>
                <p className="text-sm text-muted">Replace everything with the 13 October practice results.</p>
              </div>
              <Button variant="danger" onClick={() => setConfirm({ kind: 'reset' })}>
                <RotateCcw size={16} aria-hidden /> Restore sample
              </Button>
            </div>

            <div className="flex flex-col gap-4 border-t border-hairline pt-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h3 className="font-medium">Erase all data</h3>
                <p className="text-sm text-muted">Delete every task, result, check-in and journal entry. Preferences are kept.</p>
              </div>
              <Button variant="danger" onClick={() => setConfirm({ kind: 'clear' })}>
                <Trash2 size={16} aria-hidden /> Erase all
              </Button>
            </div>
          </div>
        </Card>
      </div>

      <ConfirmDialog
        open={confirm?.kind === 'reset'}
        title="Restore sample data?"
        message={<>This replaces your current data ({counts(data)}) with the sample results. Export a backup first if you might need it.</>}
        confirmLabel="Replace with sample"
        onCancel={() => setConfirm(null)}
        onConfirm={() => {
          actions.resetToSample()
          setConfirm(null)
          toast({ message: 'Sample data restored.' })
        }}
      />
      <ConfirmDialog
        open={confirm?.kind === 'clear'}
        title="Erase all data?"
        message={<>This permanently deletes {counts(data)} from this browser. This can’t be undone.</>}
        confirmLabel="Erase everything"
        onCancel={() => setConfirm(null)}
        onConfirm={() => {
          actions.clearAll()
          setConfirm(null)
          toast({ message: 'All data erased.', tone: 'info' })
        }}
      />
      <ConfirmDialog
        open={importPreview != null}
        title="Replace data with this backup?"
        message={
          importPreview && (
            <>
              <p>
                <span className="text-ink">{importPreview.fileName}</span> is valid and contains {counts(importPreview.data)}.
              </p>
              <p className="mt-2">Your current data ({counts(data)}) will be replaced.</p>
            </>
          )
        }
        confirmLabel="Import and replace"
        onCancel={() => setImportPreview(null)}
        onConfirm={() => {
          if (importPreview) {
            actions.replaceAll(importPreview.data)
            toast({ message: 'Backup imported.' })
          }
          setImportPreview(null)
        }}
      />
      <Dialog
        open={importErrors != null}
        onClose={() => setImportErrors(null)}
        title="This file can’t be imported"
        description="Nothing was changed. Problems found:"
        size="sm"
        footer={<Button onClick={() => setImportErrors(null)}>Close</Button>}
      >
        <ul className="list-disc space-y-1 pl-5 font-mono text-xs text-danger">
          {importErrors?.map((e) => <li key={e}>{e}</li>)}
        </ul>
      </Dialog>
    </>
  )
}
