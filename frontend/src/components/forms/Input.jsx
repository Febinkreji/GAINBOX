import { cn } from '@/utils/cn'

export default function Input({ className, ...props }) {
  return (
    <input
      className={cn(
        'h-10 w-full rounded-lg border border-neutral-800 bg-neutral-900/60 px-3 text-sm text-neutral-100',
        'placeholder:text-neutral-500 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500',
        className,
      )}
      {...props}
    />
  )
}
