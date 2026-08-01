import { useCallback, useEffect, useState } from 'react'
import { BarChart3, BatteryMedium, CheckCircle2, Tablet, Wifi } from 'lucide-react'
import PageHeader from '@/components/common/PageHeader'
import EmptyState from '@/components/common/EmptyState'
import ErrorState from '@/components/common/ErrorState'
import SectionCard from '@/components/common/SectionCard'
import StatCard from '@/components/dashboard/StatCard'
import { useToast } from '@/hooks/useToast'
import { listDevices, getDeviceSyncStatus } from '@/services/deviceService'
import { ENTITY_SYNC_TONE, ENTITY_SYNC_LABEL, deriveEntitySyncState } from '@/utils/surfboardSyncStatus'
import Badge from '@/components/ui/Badge'

// Phase 2B — Merchant Dashboard. "Terminal analytics": read-only aggregates
// derived from the same Surfboard terminal telemetry Payments/index.jsx and
// Devices/index.jsx render per-row — no separate analytics backend, this
// page just summarizes what getDeviceSyncStatus() already returns across
// every device. Not a revenue/transactions dashboard (no ledger exists yet).
function summarizeTerminals(items) {
  const total = items.length
  const online = items.filter((item) => item.sync?.terminalStatus === 'ACTIVE').length
  const synced = items.filter((item) => deriveEntitySyncState(item.sync) === 'synced').length
  const withBattery = items.filter((item) => item.sync?.batteryPercentage != null)
  const avgBattery = withBattery.length
    ? Math.round(withBattery.reduce((sum, item) => sum + item.sync.batteryPercentage, 0) / withBattery.length)
    : null

  const byStatus = {}
  items.forEach((item) => {
    const key = deriveEntitySyncState(item.sync)
    byStatus[key] = (byStatus[key] ?? 0) + 1
  })

  return { total, online, synced, avgBattery, byStatus }
}

export default function Analytics() {
  const toast = useToast()
  const [state, setState] = useState({ status: 'loading', items: [] })

  const load = useCallback(async () => {
    setState((prev) => ({ ...prev, status: 'loading' }))
    try {
      const devicesRes = await listDevices({ pageSize: 100 })
      const results = await Promise.allSettled(devicesRes.data.map((device) => getDeviceSyncStatus(device.id)))
      const items = devicesRes.data.map((device, index) => ({
        ...device,
        sync: results[index].status === 'fulfilled' ? results[index].value : null,
      }))
      setState({ status: 'ready', items })
    } catch (error) {
      setState({ status: 'error', items: [] })
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
        <PageHeader title="Analytics" description="Understand business performance across branches and membership plans." />
        <ErrorState description="We couldn't load terminal analytics." onRetry={load} />
      </>
    )
  }

  const isLoading = state.status === 'loading'
  const summary = isLoading ? null : summarizeTerminals(state.items)

  return (
    <>
      <PageHeader
        title="Analytics"
        description="Terminal analytics across your payment devices, backed by live Surfboard telemetry."
      />

      {!isLoading && state.items.length === 0 ? (
        <EmptyState
          icon={BarChart3}
          title="No terminals to analyze yet"
          description="Register a payment terminal to see analytics here."
        />
      ) : (
        <>
          <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="Total Terminals" value={isLoading ? '—' : summary.total} icon={Tablet} loading={isLoading} />
            <StatCard label="Online Now" value={isLoading ? '—' : summary.online} icon={Wifi} loading={isLoading} />
            <StatCard
              label="Synced with Surfboard"
              value={isLoading ? '—' : summary.synced}
              icon={CheckCircle2}
              loading={isLoading}
            />
            <StatCard
              label="Avg Battery"
              value={isLoading ? '—' : summary.avgBattery != null ? `${summary.avgBattery}%` : '—'}
              icon={BatteryMedium}
              loading={isLoading}
            />
          </div>

          {!isLoading && (
            <SectionCard title="Sync Breakdown" description="Payment sync status across all registered terminals">
              <ul className="space-y-2.5">
                {['synced', 'pending', 'failed'].map((key) => (
                  <li key={key} className="flex items-center justify-between text-sm">
                    <Badge tone={ENTITY_SYNC_TONE[key]}>{ENTITY_SYNC_LABEL[key]}</Badge>
                    <span className="font-medium tabular-nums text-neutral-900 dark:text-neutral-100">
                      {summary.byStatus[key] ?? 0}
                    </span>
                  </li>
                ))}
              </ul>
            </SectionCard>
          )}
        </>
      )}
    </>
  )
}
