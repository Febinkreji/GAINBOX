import { cn } from '@/utils/cn'

export default function SectionCard({ title, description, action, children, className, bodyClassName }) {
  return (
    <div
      className={cn(
        'rounded-2xl border border-neutral-800 bg-neutral-900/40 shadow-sm transition-colors duration-200 hover:border-neutral-700/80',
        className,
      )}
    >
      <div className="flex items-center justify-between gap-4 border-b border-neutral-800/80 px-5 py-4">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-neutral-100">{title}</h3>
          {description && <p className="mt-0.5 truncate text-xs text-neutral-500">{description}</p>}
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>
      <div className={cn('p-5', bodyClassName)}>{children}</div>
    </div>
  )
}
