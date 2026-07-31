import { useEffect, useState } from 'react'
import SectionCard from '@/components/common/SectionCard'
import Skeleton from '@/components/ui/Skeleton'
import { cn } from '@/utils/cn'

const RADIUS = 42
const CIRCUMFERENCE = 2 * Math.PI * RADIUS

export default function DeviceStatusCard({ healthyPercent, breakdown, loading = false }) {
  const [drawn, setDrawn] = useState(false)

  useEffect(() => {
    if (loading) return undefined
    const raf = requestAnimationFrame(() => setDrawn(true))
    return () => cancelAnimationFrame(raf)
  }, [loading])

  const dashLength = drawn ? (healthyPercent / 100) * CIRCUMFERENCE : 0

  return (
    <SectionCard title="Device Status" description="Payment terminals across all branches">
      {loading ? (
        <div className="flex items-center gap-6">
          <Skeleton className="h-28 w-28 shrink-0 rounded-full" />
          <div className="flex-1 space-y-3">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-6">
          <div className="relative flex h-28 w-28 shrink-0 items-center justify-center">
            <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
              <circle cx="50" cy="50" r={RADIUS} fill="none" className="stroke-neutral-200 dark:stroke-neutral-800" strokeWidth="8" />
              <circle
                cx="50"
                cy="50"
                r={RADIUS}
                fill="none"
                className="stroke-emerald-500 dark:stroke-emerald-400"
                strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray={`${dashLength} ${CIRCUMFERENCE - dashLength}`}
                style={{ transition: 'stroke-dasharray 1s cubic-bezier(0.16, 1, 0.3, 1)' }}
              />
            </svg>
            <div className="absolute flex flex-col items-center">
              <span className="text-xl font-semibold text-neutral-950 dark:text-neutral-50">{healthyPercent}%</span>
              <span className="text-[11px] text-neutral-500">Healthy</span>
            </div>
          </div>

          <ul className="flex-1 space-y-2.5">
            {breakdown.map((item) => (
              <li key={item.label} className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2 text-neutral-600 dark:text-neutral-300">
                  <span className="relative flex h-2 w-2 shrink-0">
                    {item.live && (
                      <span
                        className={cn(
                          'absolute inline-flex h-full w-full animate-ping rounded-full opacity-75',
                          item.dotClass,
                        )}
                      />
                    )}
                    <span className={cn('relative inline-flex h-2 w-2 rounded-full', item.dotClass)} />
                  </span>
                  {item.label}
                </span>
                <span className="font-medium tabular-nums text-neutral-900 dark:text-neutral-100">{item.count}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </SectionCard>
  )
}
