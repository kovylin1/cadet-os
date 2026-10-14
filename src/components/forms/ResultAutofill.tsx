import { useId, useRef, useState, type DragEvent } from 'react'
import { ClipboardPaste, FileUp, Loader2 } from 'lucide-react'
import clsx from 'clsx'
import { parseResultText, type ParseResult } from '../../lib/resultParser'
import { readResultFile } from '../../lib/readResultFile'
import { Button } from '../ui/Button'
import { Textarea } from '../ui/Field'

interface Props {
  onParsed: (result: ParseResult) => void
}

type Status = { kind: 'idle' } | { kind: 'busy'; message: string } | { kind: 'done'; message: string; ok: boolean }

/** Upload a screenshot/PDF or paste text; recognised fields are handed back to fill the form. */
export function ResultAutofill({ onParsed }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const pasteId = useId()
  const [status, setStatus] = useState<Status>({ kind: 'idle' })
  const [pasting, setPasting] = useState(false)
  const [pasted, setPasted] = useState('')
  const [dragOver, setDragOver] = useState(false)
  const busy = status.kind === 'busy'

  function finish(text: string, source: string) {
    const result = parseResultText(text)
    const scores = result.found.filter((f) => f !== 'category' && f !== 'date' && f !== 'duration')
    if (!result.found.length) {
      setStatus({ kind: 'done', ok: false, message: `Nothing recognisable in the ${source}. Fill the form by hand, or use “Work with AI” — an AI can read the screenshot for you.` })
      return
    }
    onParsed(result)
    setStatus({
      kind: 'done',
      ok: scores.length > 0,
      message: `Filled from the ${source}: ${result.found.join(', ')}.${scores.length ? '' : ' No scores found.'} Check everything before saving.`,
    })
  }

  async function handleFile(file: File | undefined) {
    if (!file) return
    if (file.size > 15 * 1024 * 1024) {
      setStatus({ kind: 'done', ok: false, message: 'That file is over 15 MB. Try a cropped screenshot.' })
      return
    }
    setStatus({ kind: 'busy', message: 'Reading file…' })
    try {
      const text = await readResultFile(file, (message) => setStatus({ kind: 'busy', message }))
      finish(text, file.type.startsWith('image/') ? 'image' : 'file')
    } catch (error) {
      setStatus({ kind: 'done', ok: false, message: error instanceof Error ? error.message : 'Could not read that file.' })
    }
  }

  function onDrop(e: DragEvent) {
    e.preventDefault()
    setDragOver(false)
    void handleFile(e.dataTransfer.files[0])
  }

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault()
        setDragOver(true)
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={onDrop}
      className={clsx(
        'flex flex-col gap-3 rounded-card border border-dashed p-4 transition-colors duration-200',
        dragOver ? 'border-accent bg-accent/8' : 'border-control',
      )}
    >
      <div className="flex flex-wrap items-center gap-2">
        <Button onClick={() => inputRef.current?.click()} disabled={busy}>
          {busy ? <Loader2 size={16} aria-hidden className="animate-spin" /> : <FileUp size={16} aria-hidden />}
          Upload screenshot or PDF
        </Button>
        <Button variant="ghost" onClick={() => setPasting((p) => !p)} aria-expanded={pasting} disabled={busy}>
          <ClipboardPaste size={16} aria-hidden /> Paste text
        </Button>
        <span className="text-xs text-muted">or drop a file here · read on this device</span>
        <input
          ref={inputRef}
          type="file"
          accept="image/*,application/pdf,.pdf,.txt"
          className="sr-only"
          tabIndex={-1}
          aria-hidden
          onChange={(e) => {
            void handleFile(e.target.files?.[0])
            e.target.value = ''
          }}
        />
      </div>

      {pasting && (
        <div className="flex flex-col gap-2">
          <label htmlFor={pasteId} className="text-sm font-medium">
            Result text
          </label>
          <Textarea
            id={pasteId}
            rows={4}
            value={pasted}
            onChange={(e) => setPasted(e.target.value)}
            placeholder="Paste the results page text here"
          />
          <Button
            size="sm"
            className="self-start"
            disabled={!pasted.trim()}
            onClick={() => {
              finish(pasted, 'text')
              setPasting(false)
            }}
          >
            Read text
          </Button>
        </div>
      )}

      <p aria-live="polite" className={clsx('text-sm', status.kind === 'done' && !status.ok ? 'text-warn' : 'text-muted')}>
        {status.kind === 'idle' ? 'Fills the score fields it can recognise. Anything it can’t read stays empty.' : status.message}
      </p>
    </div>
  )
}
