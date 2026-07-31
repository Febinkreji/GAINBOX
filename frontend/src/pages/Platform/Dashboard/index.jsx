import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Building2, CheckCircle2, Clock, MapPin, Repeat, ShieldOff, Tablet, Ticket } from 'lucide-react'
import PageHeader from '@/components/common/PageHeader'
import SectionCard from '@/components/common/SectionCard'
import EmptyState from '@/components/common/EmptyState'
import ErrorState from '@/components/common/ErrorState'
import StatCard from '@/components/dashboard/StatCard'
import Badge from '@/components/ui/Badge'
import { useToast } from '@/hooks/useToast'
import { getDashboardSummary } from '@/services/platformService'
import { platformMerchantDetailsPath } from '@/constants/routes'

const STATUS_TONE = { pending: 'warning', active: 'success', suspended: 'danger' }

export default function PlatformDashboard() {
  const navigate = useNavigate()
  const toast = useToast()
  const [state, setState] = useState({ status: 'loading', data: null })

  const load = useCallback(async () => {
    setState({ status: 'loading', data: null })
    try {
      const data = await getDashboardSummary()
      setState({ status: 'ready', data })
    } catch (error) {
      setState({ status: 'error', data: null })
      toast.error(error.message)
    }
  }, [toast])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load()
  }, [load])

  if (state.status === 'error') {
    return (
      <>
        <PageHeader title="Platform Dashboard" description="A live snapshot of every merchant and user on GainBox." />
        <ErrorState description="We couldn't load the platform dashboard." onRetry={load} />
      </>
    )
  }

  const isLoading = state.status === 'loading'
  const data = state.data

  return (
    <>
      <PageHeader title="Platform Dashboard" description="A live snapshot of every merchant and user on GainBox." />

      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Merchants" value={isLoading ? '—' : data.merchants} icon={Building2} loading={isLoading} />
        <StatCard label="Active" value={isLoading ? '—' : data.activeMerchants} icon={CheckCircle2} loading={isLoading} />
        <StatCard label="Pending" value={isLoading ? '—' : data.pendingMerchants} icon={Clock} loading={isLoading} />
        <StatCard label="Suspended" value={isLoading ? '—' : data.suspendedMerchants} icon={ShieldOff} loading={isLoading} />
        <StatCard label="Branches" value={isLoading ? '—' : data.branches} icon={MapPin} loading={isLoading} />
        <StatCard label="Devices" value={isLoading ? '—' : data.devices} icon={Tablet} loading={isLoading} />
        <StatCard label="Membership Plans" value={isLoading ? '—' : data.membershipPlans} icon={Ticket} loading={isLoading} />
        <StatCard label="Subscriptions" value={isLoading ? '—' : data.subscriptions} icon={Repeat} loading={isLoading} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <SectionCard title="Pending Merchants" description="Created but not yet activated">
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, index) => (
                <div key={index} className="h-10 animate-pulse rounded-lg bg-neutral-200/50 dark:bg-neutral-800/50" />
              ))}
            </div>
          ) : data.pendingMerchantsList.length === 0 ? (
            <EmptyState compact title="Nothing pending" description="Every merchant has been activated." />
          ) : (
            <div className="space-y-1">
              {data.pendingMerchantsList.map((merchant) => (
                <button
                  key={merchant.id}
                  type="button"
                  onClick={() => navigate(platformMerchantDetailsPath(merchant.id))}
                  className="-mx-2 flex w-full items-center justify-between rounded-lg px-2 py-2.5 text-left hover:bg-neutral-100/50 dark:hover:bg-neutral-900/50"
                >
                  <span className="truncate text-sm font-medium text-neutral-900 dark:text-neutral-100">{merchant.businessName}</span>
                  <Badge tone={STATUS_TONE.pending}>pending</Badge>
                </button>
              ))}
            </div>
          )}
        </SectionCard>

        <SectionCard title="Recent Activity" description="Latest audited actions across the platform">
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, index) => (
                <div key={index} className="h-10 animate-pulse rounded-lg bg-neutral-200/50 dark:bg-neutral-800/50" />
              ))}
            </div>
          ) : data.recentActivity.length === 0 ? (
            <EmptyState compact title="No activity yet" description="Actions will appear here as they happen." />
          ) : (
            <ul className="space-y-3">
              {data.recentActivity.map((entry) => (
                <li key={entry.id} className="flex items-start justify-between gap-3 text-sm">
                  <div className="min-w-0">
                    <p className="truncate text-neutral-800 dark:text-neutral-200">{entry.action}</p>
                    <p className="text-xs text-neutral-500">{entry.actor?.displayName || 'System'}</p>
                  </div>
                  <span className="shrink-0 text-xs text-neutral-500">
                    {new Date(entry.timestamp).toLocaleDateString()}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>
      </div>
    </>
  )
}
