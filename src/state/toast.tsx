import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react'
import { AlertTriangle, CheckCircle2, Info, X } from 'lucide-react'
import clsx from 'clsx'

type Tone = 'success' | 'error' | 'info'

interface ToastInput {
  message: string
  tone?: Tone
  action?: { label: string; onClick: () => void }
  /** ms; errors stay until dismissed. */
  duration?: number
}

interface Toast extends ToastInput {
  id: number
  tone: Tone
}

const ToastContext = createContext<((t: ToastInput) => void) | null>(null)

const ICONS = { success: CheckCircle2, error: AlertTriangle, info: Info }

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const nextId = useRef(1)

  const dismiss = useCallback((id: number) => setToasts((all) => all.filter((t) => t.id !== id)), [])

  const show = useCallback(
    (input: ToastInput) => {
      const id = nextId.current++
      const tone = input.tone ?? 'success'
      // Errors stay until dismissed; other toasts are capped so they never pile over content.
      setToasts((all) => [...all.filter((t) => t.tone === 'error'), ...all.filter((t) => t.tone !== 'error').slice(-1), { ...input, id, tone }])
      const duration = input.duration ?? (tone === 'error' ? 0 : input.action ? 10000 : 4000)
      if (duration > 0) window.setTimeout(() => dismiss(id), duration)
    },
    [dismiss],
  )

  const value = useMemo(() => show, [show])

  return (
    <ToastContext.Provider value={value}>
      {children}
      {/* Polite live region: announced without stealing focus. Sits above the mobile tab bar. */}
      <div
        aria-live="polite"
        role="status"
        className="pointer-events-none fixed inset-x-4 bottom-[calc(5rem+env(safe-area-inset-bottom))] z-50 flex flex-col items-center gap-2 sm:inset-x-auto sm:right-6 sm:bottom-6 sm:items-end"
      >
        {toasts.map((t) => {
          const Icon = ICONS[t.tone]
          return (
            <div
              key={t.id}
              className="pointer-events-auto flex w-full max-w-sm animate-toast-in items-start gap-3 rounded-card border border-hairline bg-surface-raised px-4 py-3 text-sm shadow-xl shadow-black/30 forced-border"
            >
              <Icon
                size={18}
                aria-hidden
                className={clsx(
                  'mt-px shrink-0',
                  t.tone === 'success' && 'text-good',
                  t.tone === 'error' && 'text-danger',
                  t.tone === 'info' && 'text-accent',
                )}
              />
              <p className="flex-1 text-ink">{t.message}</p>
              {t.action && (
                <button
                  type="button"
                  onClick={() => {
                    t.action!.onClick()
                    dismiss(t.id)
                  }}
                  className="-my-1 shrink-0 rounded-control px-2 py-1 font-medium text-accent hover:bg-accent/10"
                >
                  {t.action.label}
                </button>
              )}
              <button
                type="button"
                onClick={() => dismiss(t.id)}
                aria-label="Dismiss notification"
                className="-my-1 -mr-2 shrink-0 rounded-control p-1 text-muted hover:bg-surface hover:text-ink"
              >
                <X size={16} aria-hidden />
              </button>
            </div>
          )
        })}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used inside ToastProvider')
  return ctx
}
