import { Code2 } from 'lucide-react'
import PageHeader from '@/components/common/PageHeader'
import Badge from '@/components/ui/Badge'
import { SURFBOARD_CAPABILITIES, SURFBOARD_STATUS } from '@/constants/surfboard'

const STATUS_LABEL = {
  [SURFBOARD_STATUS.PLANNED]: 'Planned',
  [SURFBOARD_STATUS.IN_PROGRESS]: 'In Progress',
  [SURFBOARD_STATUS.CONNECTED]: 'Connected',
}

const STATUS_TONE = {
  [SURFBOARD_STATUS.PLANNED]: 'neutral',
  [SURFBOARD_STATUS.IN_PROGRESS]: 'brand',
  [SURFBOARD_STATUS.CONNECTED]: 'success',
}

function formatServiceName(service) {
  return service
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (char) => char.toUpperCase())
    .trim()
}

function groupByService(capabilities) {
  const groups = []
  const indexByService = new Map()

  capabilities.forEach((capability) => {
    if (!indexByService.has(capability.service)) {
      indexByService.set(capability.service, groups.length)
      groups.push({ service: capability.service, capabilities: [] })
    }
    groups[indexByService.get(capability.service)].capabilities.push(capability)
  })

  return groups
}

const GROUPS = groupByService(SURFBOARD_CAPABILITIES)
const STATUS_COUNTS = SURFBOARD_CAPABILITIES.reduce((acc, capability) => {
  acc[capability.status] = (acc[capability.status] ?? 0) + 1
  return acc
}, {})

const SUMMARY_STATS = [
  { label: 'Capabilities Mapped', value: SURFBOARD_CAPABILITIES.length },
  { label: 'Connected', value: STATUS_COUNTS[SURFBOARD_STATUS.CONNECTED] ?? 0 },
  { label: 'Planned', value: STATUS_COUNTS[SURFBOARD_STATUS.PLANNED] ?? 0 },
]

// Internal/developer page only — deliberately not in the main merchant
// navigation; reached from Settings via "View Technical Details". Renders
// directly from the Surfboard capability registry (src/constants/surfboard.js)
// — nothing on this page is a separate copy of that data.
export default function IntegrationCenter() {
  return (
    <>
      <PageHeader
        title="Integration Center"
        description="How GainBox maps onto Surfboard's payment infrastructure, module by module."
        actions={
          <Badge tone="neutral" className="flex items-center gap-1.5">
            <Code2 size={12} />
            Developer view
          </Badge>
        }
      />

      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {SUMMARY_STATS.map((stat) => (
          <div key={stat.label} className="rounded-xl border border-neutral-800 bg-neutral-900/40 p-4">
            <p className="text-xs text-neutral-500">{stat.label}</p>
            <p className="mt-1 text-2xl font-semibold tabular-nums text-neutral-50">{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="space-y-6">
        {GROUPS.map((group) => (
          <div key={group.service} className="overflow-hidden rounded-2xl border border-neutral-800 bg-neutral-900/40">
            <div className="flex items-center justify-between gap-3 border-b border-neutral-800/80 px-5 py-3.5">
              <h2 className="text-sm font-semibold text-neutral-100">{formatServiceName(group.service)}</h2>
              <span className="rounded-md bg-neutral-800 px-2 py-1 font-mono text-[11px] text-neutral-400">
                src/services/{group.service}.js
              </span>
            </div>
            <ul className="divide-y divide-neutral-900">
              {group.capabilities.map((capability) => (
                <li
                  key={capability.key}
                  className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-neutral-200">{capability.label}</p>
                    <p className="mt-0.5 text-xs text-neutral-500">{capability.description}</p>
                  </div>
                  <Badge tone={STATUS_TONE[capability.status]} className="shrink-0">
                    {STATUS_LABEL[capability.status]}
                  </Badge>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </>
  )
}
