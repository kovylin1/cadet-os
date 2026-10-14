import { useId, useState } from 'react'
import { Bot, Check, ClipboardCopy, Diamond, NotebookPen, CalendarPlus } from 'lucide-react'
import { buildAiPrompt, dedupe, parseAiReply, type AiItems } from '../lib/aiBridge'
import { formatDay } from '../lib/dates'
import { formatValue, primaryScale, valueOn } from '../lib/metrics'
import { useActions, useData } from '../state/store'
import { useToast } from '../state/toast'
import { Button } from './ui/Button'
import { Dialog } from './ui/Dialog'
import { Textarea } from './ui/Field'
import { CategoryChip, Note } from './ui/Misc'
import { Info } from 'lucide-react'

export function AiBridgeButton({ variant = 'secondary' }: { variant?: 'secondary' | 'ghost' }) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <Button variant={variant} onClick={() => setOpen(true)}>
        <Bot size={16} aria-hidden /> Work with AI
      </Button>
      <AiBridgeDialog open={open} onClose={() => setOpen(false)} />
    </>
  )
}

export function AiBridgeDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      size="lg"
      title="Work with an AI assistant"
      description="Any chat AI (ChatGPT, Claude, Gemini…) can plan sessions, write notes or read a result screenshot. It only suggests — you review everything before it’s added."
    >
      {open && <Bridge onClose={onClose} />}
    </Dialog>
  )
}

function Bridge({ onClose }: { onClose: () => void }) {
  const data = useData()
  const actions = useActions()
  const toast = useToast()
  const replyId = useId()
  const [copied, setCopied] = useState(false)
  const [manualPrompt, setManualPrompt] = useState<string | null>(null)
  const [reply, setReply] = useState('')
  const [errors, setErrors] = useState<string[] | null>(null)
  const [preview, setPreview] = useState<{ items: AiItems; skipped: number } | null>(null)

  async function copyPrompt() {
    const prompt = buildAiPrompt(data)
    try {
      await navigator.clipboard.writeText(prompt)
      setCopied(true)
      setManualPrompt(null)
      toast({ message: 'Copied. Paste it into your AI chat.' })
    } catch {
      // Clipboard can be blocked; show the text so it can be copied by hand.
      setManualPrompt(prompt)
    }
  }

  function check() {
    const result = parseAiReply(reply)
    if (!result.ok) {
      setErrors(result.errors)
      setPreview(null)
      return
    }
    setErrors(null)
    setPreview(dedupe(result.items, data))
  }

  function add() {
    if (!preview) return
    actions.mergeItems(preview.items)
    const { tasks, journal, attempts } = preview.items
    const parts = [
      tasks.length && `${tasks.length} task${tasks.length === 1 ? '' : 's'}`,
      journal.length && `${journal.length} note${journal.length === 1 ? '' : 's'}`,
      attempts.length && `${attempts.length} result${attempts.length === 1 ? '' : 's'}`,
    ].filter(Boolean)
    toast({ message: `Added ${parts.join(', ')} from the AI.` })
    onClose()
  }

  const total = preview ? preview.items.tasks.length + preview.items.journal.length + preview.items.attempts.length : 0

  return (
    <div className="flex flex-col gap-6">
      <section aria-labelledby="ai-step-1">
        <h3 id="ai-step-1" className="font-semibold">
          1 · Give the AI your context
        </h3>
        <p className="mt-1 text-sm text-muted">
          Copies the rules, the reply format and your current results, plans and notes. Paste it into a new chat, then ask —
          e.g. “Plan my next two weeks” or attach a result screenshot and say “add this result”.
        </p>
        <Button className="mt-3" onClick={copyPrompt} data-autofocus>
          {copied ? <Check size={16} aria-hidden /> : <ClipboardCopy size={16} aria-hidden />}
          {copied ? 'Copied — copy again' : 'Copy for AI'}
        </Button>
        {manualPrompt && (
          <div className="mt-3">
            <p className="mb-1 text-sm text-warn">Your browser blocked copying. Select all text below and copy it:</p>
            <Textarea readOnly rows={6} value={manualPrompt} onFocus={(e) => e.currentTarget.select()} aria-label="Prompt for the AI" className="font-mono text-xs" />
          </div>
        )}
      </section>

      <section aria-labelledby="ai-step-2" className="border-t border-hairline pt-5">
        <h3 id="ai-step-2" className="font-semibold">
          2 · Paste the AI’s reply
        </h3>
        <label htmlFor={replyId} className="mt-1 block text-sm text-muted">
          Paste the whole answer — CADET OS picks out the data block.
        </label>
        <Textarea
          id={replyId}
          rows={6}
          value={reply}
          onChange={(e) => {
            setReply(e.target.value)
            setPreview(null)
            setErrors(null)
          }}
          className="mt-2 font-mono text-xs"
          invalid={Boolean(errors)}
          aria-describedby={errors ? `${replyId}-err` : undefined}
        />
        <Button className="mt-3" onClick={check} disabled={!reply.trim()}>
          Check reply
        </Button>

        {errors && (
          <div id={`${replyId}-err`} role="alert" className="mt-3 rounded-control border border-danger/60 px-3 py-2 text-sm">
            <p className="font-medium text-danger">Nothing was added. Problems found:</p>
            <ul className="mt-1 list-disc space-y-0.5 pl-5 font-mono text-xs text-ink">
              {errors.map((e) => (
                <li key={e}>{e}</li>
              ))}
            </ul>
            <p className="mt-2 text-muted">You can ask the AI to fix these and paste again.</p>
          </div>
        )}

        {preview && (
          <div className="mt-4 flex flex-col gap-4" aria-live="polite">
            {total === 0 ? (
              <Note icon={Info}>Everything in this reply is already in CADET OS — nothing new to add.</Note>
            ) : (
              <>
                <PreviewList icon={CalendarPlus} title="Tasks" items={preview.items.tasks.map((t) => ({
                  key: t.id,
                  main: t.title,
                  meta: `${formatDay(t.date, 'EEE d MMM')}${t.plannedMinutes ? ` · ${t.plannedMinutes} min` : ''}`,
                  cat: t.category,
                }))} />
                <PreviewList icon={NotebookPen} title="Journal notes" items={preview.items.journal.map((j) => ({
                  key: j.id,
                  main: j.learned || j.wentWell || j.changeNext || j.difficult,
                  meta: formatDay(j.date, 'EEE d MMM'),
                  cat: j.category,
                }))} />
                <PreviewList icon={Diamond} title="Results" items={preview.items.attempts.map((a) => {
                  const k = primaryScale(a)
                  return {
                    key: a.id,
                    main: `${a.name}${k ? ` — ${formatValue(valueOn(a, k)!, k)}` : ''}`,
                    meta: formatDay(a.date, 'EEE d MMM'),
                    cat: a.category,
                  }
                })} />
              </>
            )}
            {preview.skipped > 0 && <p className="text-sm text-muted">{preview.skipped} item(s) skipped — already in CADET OS.</p>}
            <div className="flex justify-end gap-2 border-t border-hairline pt-4">
              <Button variant="ghost" onClick={onClose}>
                Cancel
              </Button>
              <Button variant="primary" onClick={add} disabled={total === 0}>
                Add {total} item{total === 1 ? '' : 's'}
              </Button>
            </div>
          </div>
        )}
      </section>
    </div>
  )
}

interface PreviewItem {
  key: string
  main: string
  meta: string
  cat: import('../types').CategoryId | null
}

function PreviewList({ icon: Icon, title, items }: { icon: typeof Bot; title: string; items: PreviewItem[] }) {
  if (!items.length) return null
  return (
    <div>
      <h4 className="mb-2 flex items-center gap-2 text-sm font-medium">
        <Icon size={15} aria-hidden className="text-accent" /> {title} <span className="num text-muted">({items.length})</span>
      </h4>
      <ul className="flex max-h-56 flex-col divide-y divide-hairline overflow-y-auto rounded-control border border-hairline">
        {items.map((it) => (
          <li key={it.key} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 text-sm">
            <span className="min-w-0 flex-1 text-ink">{it.main}</span>
            <span className="flex items-center gap-2 text-xs text-muted">
              {it.cat && <CategoryChip id={it.cat} short />}
              {it.meta}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}
