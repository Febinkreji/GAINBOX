import { AlertTriangle } from 'lucide-react'
import Button from '@/components/ui/Button'
import { cn } from '@/utils/cn'

/**
 * The "API call failed" counterpart to EmptyState ("API call succeeded,
 * no rows") — kept as a separate component rather than overloading
 * EmptyState with an error mode, since the two need different tones
 * (dashed neutral border vs a red-tinted icon) and EmptyState is used in
 * places (e.g. Settings, IntegrationCenter) that have nothing to do with
 * a failed request.
 */
export default function ErrorState({ title = 'Something went wrong', description, onRetry, className }) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center rounded-xl border border-red-200 bg-red-500/5 px-6 py-16 text-center dark:border-red-900/40',
        className,
      )}
    >
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-500/10 text-red-600 dark:text-red-400">
        <AlertTriangle size={22} strokeWidth={1.5} />
      </div>
      <h3 className="text-base font-medium text-neutral-800 dark:text-neutral-200">{title}</h3>
      {description && <p className="mt-1.5 max-w-sm text-sm text-neutral-500">{description}</p>}
      {onRetry && (
        <Button type="button" variant="secondary" size="sm" className="mt-5" onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  )
}
