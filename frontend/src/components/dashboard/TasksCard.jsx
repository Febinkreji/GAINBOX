import SectionCard from '@/components/common/SectionCard'
import EmptyState from '@/components/common/EmptyState'
import Badge from '@/components/ui/Badge'
import Skeleton from '@/components/ui/Skeleton'
import { cn } from '@/utils/cn'

export default function TasksCard({ tasks, loading = false }) {
  return (
    <SectionCard title="Upcoming Tasks" description="Things that need your attention">
      {loading ? (
        <div className="space-y-2.5">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-[46px] w-full rounded-lg" />
          ))}
        </div>
      ) : tasks.length === 0 ? (
        <EmptyState compact title="Nothing due" description="You're on top of everything." />
      ) : (
        <ul className="space-y-2.5">
          {tasks.map((task) => (
            <li
              key={task.id}
              className="flex items-center justify-between gap-3 rounded-lg border border-neutral-800/60 bg-neutral-900/30 px-3.5 py-3 transition-colors duration-200 hover:border-neutral-700 hover:bg-neutral-900/50"
            >
              <div className="flex items-center gap-3">
                <span className="relative flex h-2 w-2 shrink-0">
                  {task.urgent && (
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
                  )}
                  <span className={cn('relative inline-flex h-2 w-2 rounded-full', task.urgent ? 'bg-red-400' : 'bg-neutral-600')} />
                </span>
                <p className="text-sm text-neutral-200">{task.title}</p>
              </div>
              <Badge tone={task.urgent ? 'danger' : 'neutral'} className="shrink-0">
                {task.due}
              </Badge>
            </li>
          ))}
        </ul>
      )}
    </SectionCard>
  )
}
