import { ArrowUpRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import SectionCard from '@/components/common/SectionCard'
import Skeleton from '@/components/ui/Skeleton'

export default function QuickActionsCard({ actions, loading = false }) {
  return (
    <SectionCard title="Quick Actions" description="Jump back into common tasks">
      {loading ? (
        <div className="grid grid-cols-2 gap-3">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-[92px] rounded-xl" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {actions.map((action) => (
            <Link
              key={action.label}
              to={action.to}
              className="group relative flex flex-col items-start gap-2.5 rounded-xl border border-neutral-200 bg-neutral-50 p-3.5 transition-all duration-200 hover:-translate-y-0.5 hover:border-brand-500/40 hover:bg-white hover:shadow-premium-hover dark:border-neutral-800 dark:bg-neutral-900/40 dark:hover:bg-neutral-900"
            >
              <ArrowUpRight
                size={14}
                className="absolute right-3 top-3 -translate-y-1 text-neutral-300 opacity-0 transition-all duration-200 group-hover:translate-y-0 group-hover:text-brand-600 group-hover:opacity-100 dark:text-neutral-600 dark:group-hover:text-brand-400"
              />
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-brand-500/20 to-brand-500/5 text-brand-600 ring-1 ring-inset ring-brand-500/10 transition-transform duration-200 group-hover:scale-110 dark:text-brand-400">
                <action.icon size={17} strokeWidth={1.75} />
              </span>
              <span className="text-sm font-medium text-neutral-800 dark:text-neutral-200">{action.label}</span>
            </Link>
          ))}
        </div>
      )}
    </SectionCard>
  )
}
