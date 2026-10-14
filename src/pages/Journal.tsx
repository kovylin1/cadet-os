import { useMemo, useState } from 'react'
import { BookOpen, Pencil, Plus, Trash2 } from 'lucide-react'
import type { CategoryId, JournalEntry } from '../types'
import { CATEGORIES } from '../lib/categories'
import { formatDay } from '../lib/dates'
import { useActions, useData } from '../state/store'
import { useToast } from '../state/toast'
import { PageHeader } from '../components/layout/AppShell'
import { JOURNAL_PROMPTS, JournalForm } from '../components/forms/JournalForm'
import { AiBridgeButton } from '../components/AiBridge'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { ConfirmDialog, Dialog } from '../components/ui/Dialog'
import { Select } from '../components/ui/Field'
import { CategoryChip, EmptyState } from '../components/ui/Misc'

type Filter = 'all' | 'general' | CategoryId

export function Journal() {
  const { journal } = useData()
  const actions = useActions()
  const toast = useToast()
  const [filter, setFilter] = useState<Filter>('all')
  const [composing, setComposing] = useState(false)
  const [editing, setEditing] = useState<JournalEntry | null>(null)
  const [deleting, setDeleting] = useState<JournalEntry | null>(null)

  const entries = useMemo(
    () =>
      journal
        .filter((j) => (filter === 'all' ? true : filter === 'general' ? j.category == null : j.category === filter))
        .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt)),
    [journal, filter],
  )

  const counts = useMemo(() => {
    const m = new Map<string, number>()
    for (const j of journal) m.set(j.category ?? 'general', (m.get(j.category ?? 'general') ?? 0) + 1)
    return m
  }, [journal])

  return (
    <>
      <PageHeader
        title="Journal"
        description="Four quick prompts after training. Short is fine — the habit matters more than the length."
        actions={
          <>
            <AiBridgeButton />
            {!composing && (
              <Button variant="primary" onClick={() => setComposing(true)}>
                <Plus size={16} aria-hidden /> New entry
              </Button>
            )}
          </>
        }
      />

      {composing && (
        <Card aria-labelledby="new-entry" className="mb-6 p-4 sm:p-5">
          <h2 id="new-entry" className="mb-4 font-semibold">
            New entry
          </h2>
          <JournalForm
            defaultCategory={filter !== 'all' && filter !== 'general' ? filter : null}
            onDone={() => setComposing(false)}
            onCancel={() => setComposing(false)}
          />
        </Card>
      )}

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-base font-semibold">
          {entries.length} {entries.length === 1 ? 'entry' : 'entries'}
        </h2>
        <label className="flex items-center gap-2 text-sm text-muted">
          Filter by category
          <Select value={filter} onChange={(e) => setFilter(e.target.value as Filter)} className="w-auto min-w-48">
            <option value="all">All categories ({journal.length})</option>
            <option value="general">General ({counts.get('general') ?? 0})</option>
            {CATEGORIES.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label} ({counts.get(c.id) ?? 0})
              </option>
            ))}
          </Select>
        </label>
      </div>

      {entries.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          title={journal.length ? 'No entries in this category' : 'Your journal is empty'}
          action={
            !composing && (
              <Button onClick={() => setComposing(true)}>
                <Plus size={16} aria-hidden /> Write the first entry
              </Button>
            )
          }
        >
          {journal.length ? 'Try another filter, or write one now.' : 'After your next session, note what went well and one thing to change.'}
        </EmptyState>
      ) : (
        <ol className="flex flex-col gap-3">
          {entries.map((j) => (
            <li key={j.id}>
              <Card className="p-4 sm:p-5">
                <article aria-label={`Journal entry, ${formatDay(j.date)}`}>
                  <header className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <time dateTime={j.date} className="font-medium text-ink">
                        {formatDay(j.date, 'EEEE d MMMM yyyy')}
                      </time>
                      {j.category ? <CategoryChip id={j.category} short /> : <span className="text-xs text-muted">General</span>}
                    </div>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon-sm" aria-label={`Edit entry from ${formatDay(j.date)}`} onClick={() => setEditing(j)}>
                        <Pencil size={16} aria-hidden />
                      </Button>
                      <Button variant="ghost" size="icon-sm" aria-label={`Delete entry from ${formatDay(j.date)}`} onClick={() => setDeleting(j)}>
                        <Trash2 size={16} aria-hidden />
                      </Button>
                    </div>
                  </header>
                  <dl className="mt-3 grid gap-x-6 gap-y-3 md:grid-cols-2">
                    {JOURNAL_PROMPTS.filter((p) => j[p.key]).map((p) => (
                      <div key={p.key}>
                        <dt className="text-xs font-medium text-muted">{p.label}</dt>
                        <dd className="mt-0.5 text-sm whitespace-pre-line text-ink">{j[p.key]}</dd>
                      </div>
                    ))}
                  </dl>
                </article>
              </Card>
            </li>
          ))}
        </ol>
      )}

      <Dialog open={editing != null} onClose={() => setEditing(null)} title="Edit journal entry" size="lg">
        {editing && <JournalForm key={editing.id} entry={editing} onDone={() => setEditing(null)} onCancel={() => setEditing(null)} />}
      </Dialog>
      <ConfirmDialog
        open={deleting != null}
        title="Delete journal entry?"
        message={<>The entry from {deleting ? formatDay(deleting.date) : ''} will be removed. This can’t be undone.</>}
        confirmLabel="Delete entry"
        onCancel={() => setDeleting(null)}
        onConfirm={() => {
          if (deleting) {
            actions.deleteJournal(deleting.id)
            toast({ message: 'Journal entry deleted.', tone: 'info' })
          }
          setDeleting(null)
        }}
      />
    </>
  )
}
