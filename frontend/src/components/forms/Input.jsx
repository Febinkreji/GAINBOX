import { cn } from '@/utils/cn'

export default function Input({ className, ...props }) {
  return (
    <input
      className={cn(
        'h-10 w-full rounded-lg border border-neutral-200 bg-neutral-100/60 px-3 text-sm text-neutral-900 dark:border-neutral-800 dark:bg-neutral-900/60 dark:text-neutral-100',
        'placeholder:text-neutral-400 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:placeholder:text-neutral-500',
        className,
      )}
      {...props}
    />
  )
}
