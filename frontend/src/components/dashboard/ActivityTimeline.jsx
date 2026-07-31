export default function ActivityTimeline({ items }) {
  return (
    <ol className="space-y-5">
      {items.map((item, index) => (
        <li key={item.id} className="flex gap-3">
          <div className="flex flex-col items-center">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-neutral-200 text-neutral-500 ring-4 ring-neutral-50 dark:bg-neutral-800 dark:text-neutral-400 dark:ring-neutral-900/40">
              <item.icon size={14} strokeWidth={1.75} />
            </span>
            {index < items.length - 1 && (
              <span className="mt-1 w-px flex-1 bg-gradient-to-b from-neutral-200 to-transparent dark:from-neutral-800" />
            )}
          </div>
          <div className="pb-1 pt-0.5">
            <p className="text-sm text-neutral-800 dark:text-neutral-200">{item.title}</p>
            <p className="mt-0.5 text-xs text-neutral-500">{item.time}</p>
          </div>
        </li>
      ))}
    </ol>
  )
}
