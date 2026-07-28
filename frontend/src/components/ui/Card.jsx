import { cn } from '@/utils/cn'

export default function Card({ className, children, ...props }) {
  return (
    <div
      className={cn('rounded-xl border border-neutral-800 bg-neutral-900/40 p-6 shadow-sm', className)}
      {...props}
    >
      {children}
    </div>
  )
}
