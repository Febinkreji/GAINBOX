import { cn } from '@/utils/cn'

export default function EmptyState({ icon: Icon, title, description, className, compact = false }) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center rounded-xl border border-dashed border-neutral-800 bg-neutral-900/20 text-center',
        compact ? 'px-4 py-10' : 'px-6 py-20',
        className,
      )}
    >
      {Icon && (
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-neutral-900 text-neutral-500">
          <Icon size={22} strokeWidth={1.5} />
        </div>
      )}
      <h3 className="text-base font-medium text-neutral-200">{title}</h3>
      {description && <p className="mt-1.5 max-w-sm text-sm text-neutral-500">{description}</p>}
    </div>
  )
}
