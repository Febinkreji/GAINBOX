import { cn } from '@/utils/cn'

const VARIANT_STYLES = {
  primary: 'bg-brand-500 text-white hover:bg-brand-600',
  secondary: 'border border-neutral-800 bg-neutral-900 text-neutral-100 hover:bg-neutral-800',
  ghost: 'text-neutral-300 hover:bg-neutral-900 hover:text-neutral-100',
  danger: 'bg-red-500/10 text-red-400 hover:bg-red-500/20',
}

const SIZE_STYLES = {
  sm: 'h-8 px-3 text-sm',
  md: 'h-10 px-4 text-sm',
  lg: 'h-11 px-5 text-base',
}

export default function Button({ variant = 'primary', size = 'md', className, children, ...props }) {
  return (
    <button
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-colors',
        'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500',
        'disabled:cursor-not-allowed disabled:opacity-50',
        VARIANT_STYLES[variant],
        SIZE_STYLES[size],
        className,
      )}
      {...props}
    >
      {children}
    </button>
  )
}
