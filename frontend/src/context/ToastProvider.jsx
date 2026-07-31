import { useCallback, useState } from 'react'
import { CheckCircle2, XCircle, Info, X } from 'lucide-react'
import { ToastContext } from '@/context/ToastContext'
import { cn } from '@/utils/cn'

const TONE_STYLES = {
  success: 'border-emerald-300 bg-emerald-500/10 text-emerald-700 dark:border-emerald-500/30 dark:text-emerald-300',
  error: 'border-red-300 bg-red-500/10 text-red-700 dark:border-red-500/30 dark:text-red-300',
  info: 'border-neutral-200 bg-white text-neutral-800 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-200',
}

const TONE_ICON = { success: CheckCircle2, error: XCircle, info: Info }

let nextToastId = 0

/**
 * No toast library exists in this project — a minimal one, reusing the
 * same tone palette Badge.jsx already defines (emerald/red/neutral), so
 * this doesn't introduce a second color vocabulary.
 */
export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  const dismiss = useCallback((id) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id))
  }, [])

  const show = useCallback(
    (message, tone = 'info') => {
      const id = nextToastId++
      setToasts((prev) => [...prev, { id, message, tone }])
      setTimeout(() => dismiss(id), 5000)
      return id
    },
    [dismiss],
  )

  const value = {
    show,
    success: (message) => show(message, 'success'),
    error: (message) => show(message, 'error'),
    info: (message) => show(message, 'info'),
    dismiss,
  }

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed bottom-4 right-4 z-[100] flex w-full max-w-sm flex-col gap-2">
        {toasts.map((toast) => {
          const Icon = TONE_ICON[toast.tone]
          return (
            <div
              key={toast.id}
              className={cn(
                'animate-fade-in-up pointer-events-auto flex items-start gap-2.5 rounded-xl border px-4 py-3 text-sm shadow-lg backdrop-blur',
                TONE_STYLES[toast.tone],
              )}
            >
              <Icon size={18} className="mt-0.5 shrink-0" />
              <p className="flex-1">{toast.message}</p>
              <button type="button" onClick={() => dismiss(toast.id)} className="shrink-0 opacity-70 hover:opacity-100">
                <X size={16} />
              </button>
            </div>
          )
        })}
      </div>
    </ToastContext.Provider>
  )
}
