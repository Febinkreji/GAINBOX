import { TrendingDown, TrendingUp } from 'lucide-react'
import Sparkline from '@/components/dashboard/Sparkline'
import Skeleton from '@/components/ui/Skeleton'
import { cn } from '@/utils/cn'

export default function StatCard({ label, value, icon: Icon, trend, sparkline, hint, size = 'md', loading = false }) {
  const isLarge = size === 'lg'
  const trendUp = trend?.direction === 'up'

  if (loading) {
    return (
      <div
        className={cn(
          'rounded-2xl border border-neutral-800/80 bg-neutral-900/40 shadow-premium',
          isLarge ? 'p-6' : 'p-5',
        )}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-2.5">
            <Skeleton className="h-3.5 w-24" />
            <Skeleton className={cn('h-7', isLarge ? 'w-32' : 'w-20')} />
          </div>
          <Skeleton className={cn('rounded-xl', isLarge ? 'h-11 w-11' : 'h-10 w-10')} />
        </div>
        <Skeleton className="mt-4 h-3.5 w-28" />
      </div>
    )
  }

  return (
    <div
      className={cn(
        'group relative flex flex-col justify-between rounded-2xl border border-neutral-800/80 bg-gradient-to-b from-neutral-900/60 to-neutral-900/20 shadow-premium transition-all duration-300 hover:-translate-y-1 hover:border-neutral-700 hover:shadow-premium-hover',
        isLarge ? 'p-6' : 'p-5',
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium text-neutral-400">{label}</p>
          <p
            className={cn(
              'mt-2 font-semibold tabular-nums text-neutral-50',
              isLarge ? 'text-[28px] leading-none' : 'text-2xl',
            )}
          >
            {value}
          </p>
        </div>
        {Icon && (
          <div
            className={cn(
              'flex shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500/20 to-brand-500/5 text-brand-400 ring-1 ring-inset ring-brand-500/10 transition-transform duration-300 group-hover:scale-110',
              isLarge ? 'h-11 w-11' : 'h-10 w-10',
            )}
          >
            <Icon size={isLarge ? 22 : 20} strokeWidth={1.75} />
          </div>
        )}
      </div>

      {(trend || sparkline) && (
        <div className="mt-4 flex items-center justify-between gap-3">
          {trend && (
            <span
              className={cn(
                'flex items-center gap-1 text-xs font-medium',
                trendUp ? 'text-emerald-400' : 'text-red-400',
              )}
            >
              {trendUp ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
              {trend.label}
            </span>
          )}
          {sparkline && <Sparkline data={sparkline} className={trendUp ? 'text-emerald-400' : 'text-red-400'} />}
        </div>
      )}

      {hint && !trend && !sparkline && <p className="mt-3 text-xs text-neutral-500">{hint}</p>}
    </div>
  )
}
