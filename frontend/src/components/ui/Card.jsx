import { cn } from '@/utils/cn'

export default function Card({ className, children, ...props }) {
  return (
    <div
      className={cn(
        'rounded-xl border border-neutral-200 bg-white p-6 shadow-sm dark:border-neutral-800 dark:bg-neutral-900/40',
        className,
      )}
      {...props}
    >
      {children}
    </div>
  )
}
