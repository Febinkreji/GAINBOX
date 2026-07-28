import { cn } from '@/utils/cn'

export default function Skeleton({ className }) {
  return <div className={cn('skeleton-shimmer rounded-md', className)} />
}
