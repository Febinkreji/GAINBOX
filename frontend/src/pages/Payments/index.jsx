import { useCallback, useEffect, useState } from 'react'
import { CreditCard } from 'lucide-react'
import PageHeader from '@/components/common/PageHeader'
import EmptyState from '@/components/common/EmptyState'
import ErrorState from '@/components/common/ErrorState'
import Card from '@/components/ui/Card'
import Skeleton from '@/components/ui/Skeleton'
import DataTable from '@/components/tables/DataTable'
import Badge from '@/components/ui/Badge'
import { useToast } from '@/hooks/useToast'
import { listDevices, getDeviceSyncStatus } from '@/services/deviceService'
import { listBranches } from '@/services/storeService'
import { getMerchantPaymentStatus } from '@/services/merchantService'

// Phase 2B — Merchant Dashboard. Read-only view of the merchant's payment
// terminals (Device -> Surfboard Terminal), sourced from the same
// getDeviceSyncStatus() endpoint the Devices page uses — no transaction
// ledger exists yet (that's a distinct, larger scope not asked for here),
// so this page shows terminal provisioning/telemetry, not payment history.
const TERMINAL_STATUS_TONE = {
  ACTIVE: 'success',
  REGISTERED: 'brand',
  IN_ACTIVE: 'warning',
  DE_REGISTERED: 'neutral',
}

// Phase 3 — Payment Infrastructure. Same derivation/labels as
// MerchantDetails' (Platform Admin) view — read-only here, no Refresh Sync
// action (that stays Platform Admin only).
const PAYMENT_STATUS_TONE = { active: 'success', incomplete: 'warning', not_configured: 'neutral' }
const PAYMENT_STATUS_LABEL = { active: 'Payments Active', incomplete: 'Payments Incomplete', not_configured: 'Not Configured' }

export default function Payments() {
  const toast = useToast()
  const [state, setState] = useState({ status: 'loading', items: [] })
  const [branches, setBranches] = useState([])
  // Independent of the terminals list below — a failure here (or the
  // merchant not yet having reached MERCHANT_CREATED) shouldn't block the
  // rest of this page, same reasoning as every other split-fetch page in
  // this codebase.
  const [configState, setConfigState] = useState({ status: 'loading', config: null })

  const load = useCallback(async () => {
    setState((prev) => ({ ...prev, status: 'loading' }))
    try {
      const [devicesRes, branchesRes] = await Promise.all([
        listDevices({ pageSize: 100 }),
        listBranches({ pageSize: 100 }),
      ])
      setBranches(branchesRes.data)

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

  const loadConfig = useCallback(async () => {
    try {
      const config = await getMerchantPaymentStatus()
      setConfigState({ status: 'ready', config })
    } catch {
      setConfigState({ status: 'error', config: null })
    }
  }, [])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load()
    loadConfig()
  }, [load, loadConfig])

  const branchNameById = Object.fromEntries(branches.map((branch) => [branch.id, branch.name]))

  const columns = [
    { key: 'label', header: 'Terminal' },
    { key: 'branch', header: 'Branch', render: (row) => branchNameById[row.branchId] ?? '—' },
    {
      key: 'terminalStatus',
      header: 'Terminal Status',
      render: (row) => {
        const terminalStatus = row.sync?.terminalStatus
        if (!terminalStatus) return <span className="text-xs text-neutral-500">Not provisioned</span>
        return <Badge tone={TERMINAL_STATUS_TONE[terminalStatus] ?? 'neutral'}>{terminalStatus.replace('_', ' ')}</Badge>
      },
    },
    {
      key: 'battery',
      header: 'Battery',
      render: (row) => (row.sync?.batteryPercentage != null ? `${row.sync.batteryPercentage}%` : '—'),
    },
    {
      key: 'lastSeen',
      header: 'Last Seen',
      render: (row) => (row.sync?.lastAliveAt ? new Date(row.sync.lastAliveAt).toLocaleString() : '—'),
    },
    {
      key: 'capabilities',
      header: 'Capabilities',
      render: (row) => {
        const sync = row.sync
        if (!sync?.terminalType && !sync?.terminalPaymentMethods?.length) return '—'
        return (
          <div className="flex flex-wrap items-center gap-1.5">
            {sync.terminalType && <Badge tone="neutral">{sync.terminalType}</Badge>}
            {sync.terminalPaymentMethods?.map((method) => (
              <Badge key={method} tone="brand">
                {method}
              </Badge>
            ))}
          </div>
        )
      },
    },
  ]

  const config = configState.config

  return (
    <>
      <PageHeader
        title="Payments"
        description="Payment terminals and configuration, provisioned through Surfboard's payment infrastructure."
      />

      {/* Phase 3 — Payment Infrastructure. Payment configuration/status —
          read-only, sourced from GET /merchant/payment-status. */}
      <Card className="mb-6">
        <h2 className="mb-4 text-sm font-semibold text-neutral-900 dark:text-neutral-100">Payment Configuration</h2>

        {configState.status === 'loading' ? (
          <div className="space-y-3">
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-4 w-2/3" />
          </div>
        ) : configState.status === 'error' || !config?.connected ? (
          <p className="text-sm text-neutral-500">Payment configuration isn't available yet for this merchant.</p>
        ) : (
          <>
            <Badge tone={PAYMENT_STATUS_TONE[config.paymentStatus] ?? 'neutral'}>
              {PAYMENT_STATUS_LABEL[config.paymentStatus] ?? config.paymentStatus}
            </Badge>

            {(config.enabledPaymentMethods?.length > 0 || config.paymentMethods?.length > 0) && (
              <div className="mt-4">
                <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">Enabled Payment Methods</p>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {config.enabledPaymentMethods?.length > 0
                    ? config.enabledPaymentMethods.map((method) => (
                        <Badge key={method.paymentMethodId ?? method.paymentMethod} tone="success">
                          {method.paymentMethod}
                        </Badge>
                      ))
                    : config.paymentMethods.map((method) => (
                        <Badge key={method.paymentMethod} tone={method.status === 'ACTIVATED' ? 'success' : 'neutral'}>
                          {method.paymentMethod} · {method.status}
                        </Badge>
                      ))}
                </div>
              </div>
            )}

            {config.paymentMethods?.find((method) => method.paymentMethod === 'CARD')?.enabledSchemes?.length > 0 && (
              <div className="mt-4">
                <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">Supported Card Schemes</p>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {config.paymentMethods
                    .find((method) => method.paymentMethod === 'CARD')
                    .enabledSchemes.map((scheme) => (
                      <Badge key={scheme} tone="brand">
                        {scheme}
                      </Badge>
                    ))}
                </div>
              </div>
            )}
          </>
        )}
      </Card>

      {state.status === 'error' ? (
        <ErrorState description="We couldn't load your payment terminals." onRetry={load} />
      ) : state.status === 'ready' && state.items.length === 0 ? (
        <EmptyState
          icon={CreditCard}
          title="No payment terminals yet"
          description="Register a device to see its terminal status here."
        />
      ) : (
        <DataTable columns={columns} rows={state.status === 'loading' ? [] : state.items} emptyMessage="Loading…" />
      )}

      {/* Phase 3 — Payment Infrastructure. Recent Payment Events — same
          settlementReports source as the Payment Configuration card above. */}
      <Card className="mt-6">
        <h2 className="mb-4 text-sm font-semibold text-neutral-900 dark:text-neutral-100">Recent Payment Events</h2>

        {config?.settlementReports?.length > 0 ? (
          <ul className="space-y-2">
            {config.settlementReports.map((report) => (
              <li
                key={report.payoutId}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-neutral-50 px-3 py-2 text-xs dark:bg-neutral-900/40"
              >
                <span className="text-neutral-600 dark:text-neutral-300">
                  {report.reportType} · {report.transactionStartDate} – {report.transactionEndDate}
                </span>
                <span className="flex items-center gap-3 text-neutral-500">
                  <span>Payout {report.payout}</span>
                  {report.url && (
                    <a
                      href={report.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-medium text-brand-600 hover:text-brand-700 dark:text-brand-400 dark:hover:text-brand-300"
                    >
                      View report
                    </a>
                  )}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-neutral-500">No payment events yet.</p>
        )}
      </Card>
    </>
  )
}
