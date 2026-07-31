import { X } from 'lucide-react'
import { cn } from '@/utils/cn'

const SIZE_STYLES = {
  sm: 'max-w-sm',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl',
}

export default function Modal({ isOpen, onClose, title, description, children, size = 'md' }) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div
        className={cn(
          'relative w-full rounded-2xl border border-neutral-200 bg-white shadow-2xl dark:border-neutral-800 dark:bg-neutral-900',
          SIZE_STYLES[size],
        )}
      >
        <div className="flex items-start justify-between gap-4 border-b border-neutral-200 px-6 py-4 dark:border-neutral-800">
          <div className="min-w-0">
            <h2 className="text-base font-semibold text-neutral-900 dark:text-neutral-100">{title}</h2>
            {description && <p className="mt-1 text-sm text-neutral-500">{description}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-lg p-1 text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900 dark:hover:bg-neutral-800 dark:hover:text-neutral-200"
          >
            <X size={20} />
          </button>
        </div>
        <div className="scrollbar-thin max-h-[70vh] overflow-y-auto px-6 py-5">{children}</div>
      </div>
    </div>
  )
}
