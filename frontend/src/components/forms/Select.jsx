import { ChevronDown } from 'lucide-react'
import { cn } from '@/utils/cn'

export default function Select({ className, children, ...props }) {
  return (
    <div className="relative">
      <select
        className={cn(
          'h-10 w-full appearance-none rounded-lg border border-neutral-200 bg-neutral-100/60 px-3 pr-9 text-sm text-neutral-900 dark:border-neutral-800 dark:bg-neutral-900/60 dark:text-neutral-100',
          'focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500',
          className,
        )}
        {...props}
      >
        {children}
      </select>
      <ChevronDown
        size={16}
        className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500"
      />
    </div>
  )
}
