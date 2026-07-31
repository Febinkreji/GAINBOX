import SectionCard from '@/components/common/SectionCard'
import EmptyState from '@/components/common/EmptyState'
import Skeleton from '@/components/ui/Skeleton'
import { cn } from '@/utils/cn'

export default function NotificationsCard({ notifications, loading = false }) {
  const unreadCount = notifications.filter((item) => item.unread).length

  return (
    <SectionCard
      title="Notifications"
      description="Alerts across your branches and devices"
      action={
        !loading &&
        unreadCount > 0 && (
          <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-brand-500/15 px-1.5 text-[11px] font-semibold text-brand-700 dark:text-brand-400">
            {unreadCount}
          </span>
        )
      }
    >
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="flex items-center gap-3 px-2 py-1">
              <Skeleton className="h-8 w-8 rounded-lg" />
              <Skeleton className="h-4 flex-1" />
            </div>
          ))}
        </div>
      ) : notifications.length === 0 ? (
        <EmptyState compact title="You're all caught up" description="New alerts will appear here." />
      ) : (
        <ul className="space-y-1">
          {notifications.map((item) => (
            <li
              key={item.id}
              className="flex items-start gap-3 rounded-lg px-2 py-2.5 transition-colors hover:bg-neutral-100/60 dark:hover:bg-neutral-900/60"
            >
              <span className="relative mt-2 flex h-1.5 w-1.5 shrink-0">
                {item.unread && (
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand-400 opacity-75" />
                )}
                <span className={cn('relative inline-flex h-1.5 w-1.5 rounded-full', item.unread ? 'bg-brand-400' : 'bg-transparent')} />
              </span>
              <span className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-lg', item.iconBg, item.iconColor)}>
                <item.icon size={15} strokeWidth={1.75} />
              </span>
              <div className="min-w-0">
                <p className="text-sm text-neutral-800 dark:text-neutral-200">{item.message}</p>
                <p className="mt-0.5 text-xs text-neutral-500">{item.time}</p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </SectionCard>
  )
}
