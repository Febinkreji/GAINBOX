import { useMemo, useState } from 'react'
import { TrendingUp } from 'lucide-react'
import SectionCard from '@/components/common/SectionCard'
import AreaChart from '@/components/dashboard/AreaChart'
import Skeleton from '@/components/ui/Skeleton'
import { cn } from '@/utils/cn'

const RANGE_KEYS = ['3M', '6M', '12M']
const RANGES = {
  '3M': (data) => data.slice(-3),
  '6M': (data) => data.slice(-6),
  '12M': (data) => data,
}

export default function RevenueTrendCard({ data, currentValue, changeLabel, loading = false }) {
  const [range, setRange] = useState('6M')
  const activeIndex = RANGE_KEYS.indexOf(range)
  const filtered = useMemo(() => RANGES[range](data), [range, data])

  return (
    <SectionCard
      title="Revenue Trend"
      description="Gross merchant revenue processed through GainBox"
      action={
        <div className="relative flex rounded-lg bg-neutral-900 p-1">
          <div
            className="absolute inset-y-1 left-1 rounded-md bg-neutral-800 transition-transform duration-300 ease-out"
            style={{ width: 'calc((100% - 8px) / 3)', transform: `translateX(${activeIndex * 100}%)` }}
          />
          {RANGE_KEYS.map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => setRange(key)}
              className={cn(
                'relative z-10 flex-1 rounded-md px-2.5 py-1 text-xs font-medium transition-colors',
                range === key ? 'text-neutral-100' : 'text-neutral-500 hover:text-neutral-300',
              )}
            >
              {key}
            </button>
          ))}
        </div>
      }
    >
      {loading ? (
        <div className="space-y-5">
          <div className="space-y-2">
            <Skeleton className="h-8 w-40" />
            <Skeleton className="h-4 w-32" />
          </div>
          <Skeleton className="h-[220px] w-full rounded-xl" />
        </div>
      ) : (
        <>
          <div className="mb-5">
            <p className="text-3xl font-semibold tabular-nums text-neutral-50">{currentValue}</p>
            <p className="mt-1.5 flex items-center gap-1 text-sm text-emerald-400">
              <TrendingUp size={14} />
              {changeLabel}
            </p>
          </div>
          <AreaChart data={filtered} />
        </>
      )}
    </SectionCard>
  )
}
