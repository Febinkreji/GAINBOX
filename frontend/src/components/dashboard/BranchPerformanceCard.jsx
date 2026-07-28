import { ArrowRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import SectionCard from '@/components/common/SectionCard'
import EmptyState from '@/components/common/EmptyState'
import Badge from '@/components/ui/Badge'
import Skeleton from '@/components/ui/Skeleton'
import { ROUTES } from '@/constants/routes'

export default function BranchPerformanceCard({ branches, loading = false }) {
  return (
    <SectionCard
      title="Branch Performance"
      description="Revenue and capacity by location, this month"
      action={
        <Link
          to={ROUTES.BRANCHES}
          className="group flex items-center gap-1 text-sm font-medium text-brand-400 transition-colors hover:text-brand-300"
        >
          View all
          <ArrowRight size={14} className="transition-transform duration-200 group-hover:translate-x-0.5" />
        </Link>
      }
    >
      {loading ? (
        <div className="space-y-5">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="space-y-2">
              <div className="flex items-center justify-between">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-14" />
              </div>
              <Skeleton className="h-1.5 w-full rounded-full" />
            </div>
          ))}
        </div>
      ) : branches.length === 0 ? (
        <EmptyState compact title="No branches yet" description="Add your first branch to see performance here." />
      ) : (
        <div className="space-y-1">
          {branches.map((branch, index) => (
            <div
              key={branch.id}
              className="-mx-2 rounded-lg px-2 py-2.5 transition-colors duration-200 hover:bg-neutral-900/50"
            >
              <div className="mb-2 flex items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-neutral-800 text-[11px] font-semibold text-neutral-400">
                    {index + 1}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-neutral-100">{branch.name}</p>
                    <p className="text-xs text-neutral-500">
                      {branch.city} · {branch.members} members
                    </p>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {branch.isNew && <Badge tone="brand">New</Badge>}
                  <p className="text-sm font-semibold tabular-nums text-neutral-100">{branch.revenue}</p>
                </div>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-neutral-800">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-brand-500 to-brand-400 shadow-[0_0_8px_0_var(--color-brand-500)] transition-[width] duration-700 ease-out"
                  style={{ width: `${branch.utilization}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </SectionCard>
  )
}
