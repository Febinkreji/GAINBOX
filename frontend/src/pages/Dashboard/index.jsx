import { useCallback, useEffect, useState } from 'react'
import { Building2, HeartPulse, MapPin, Tablet, Ticket, Users } from 'lucide-react'
import { Link, Navigate } from 'react-router-dom'
import SectionCard from '@/components/common/SectionCard'
import ErrorState from '@/components/common/ErrorState'
import EmptyState from '@/components/common/EmptyState'
import Badge from '@/components/ui/Badge'
import StatCard from '@/components/dashboard/StatCard'
import WelcomeHeader from '@/components/dashboard/WelcomeHeader'
import DeviceStatusCard from '@/components/dashboard/DeviceStatusCard'
import QuickActionsCard from '@/components/dashboard/QuickActionsCard'
import { ROUTES } from '@/constants/routes'
import { useAuth } from '@/hooks/useAuth'
import { useToast } from '@/hooks/useToast'
import { getMerchantProfile } from '@/services/merchantService'
import { listBranches } from '@/services/storeService'
import { listDevices } from '@/services/deviceService'
import { listMembershipPlans, listSubscriptions } from '@/services/membershipService'

const BRANCH_STATUS_TONE = { active: 'success', inactive: 'neutral' }

const QUICK_ACTIONS = [
  { label: 'Add Branch', icon: MapPin, to: ROUTES.BRANCHES },
  { label: 'Register Device', icon: Tablet, to: ROUTES.DEVICES },
  { label: 'Create Plan', icon: Ticket, to: ROUTES.MEMBERSHIP_PLANS },
  { label: 'Manage Staff', icon: Users, to: ROUTES.STAFF },
]

function summarizeDeviceStatus(devices) {
  const counts = { active: 0, offline: 0, registered: 0, deactivated: 0 }
  devices.forEach((device) => {
    counts[device.status] = (counts[device.status] ?? 0) + 1
  })
  const total = devices.length
  const healthyPercent = total === 0 ? 0 : Math.round((counts.active / total) * 100)

  return {
    healthyPercent,
    breakdown: [
      { label: 'Online', count: counts.active, dotClass: 'bg-emerald-400', live: counts.active > 0 },
      { label: 'Needs attention', count: counts.registered + counts.deactivated, dotClass: 'bg-amber-400' },
      { label: 'Offline', count: counts.offline, dotClass: 'bg-red-400' },
    ],
  }
}

export default function Dashboard() {
  const { merchant } = useAuth()
  const toast = useToast()
  const [state, setState] = useState({ status: 'loading', data: null })

  const load = useCallback(async () => {
    // A platform-admin has no merchant assignment by design (see
    // ProtectedRoute.jsx) — this component redirects them away below
    // before render, but `load` itself must stay a no-op for them too,
    // since it's still called unconditionally from the effect (hooks can't
    // be called conditionally): there's no merchant-scoped data to fetch.
    if (!merchant) return

    setState({ status: 'loading', data: null })

    try {
      const [profile, branchesRes, devicesRes, plansRes, subscriptionsRes] = await Promise.all([
        getMerchantProfile(),
        listBranches({ merchantId: merchant.merchantId, pageSize: 5, sortBy: 'createdAt', sortOrder: 'desc' }),
        listDevices({ pageSize: 100 }),
        listMembershipPlans({ merchantId: merchant.merchantId, pageSize: 1 }),
        listSubscriptions({ status: 'active', pageSize: 1 }),
      ])

      setState({
        status: 'ready',
        data: {
          profile,
          branches: branchesRes.data,
          branchCount: branchesRes.meta.total,
          deviceStatus: summarizeDeviceStatus(devicesRes.data),
          deviceCount: devicesRes.meta.total,
          planCount: plansRes.meta.total,
          activeSubscriptionCount: subscriptionsRes.meta.total,
        },
      })
    } catch (error) {
      setState({ status: 'error', data: null })
      toast.error(error.message)
    }
  }, [merchant, toast])

  useEffect(() => {
    // Standard fetch-on-mount: no data-fetching library exists in this
    // project (see services/apiClient.js), so a plain useEffect + retry-
    // capable useCallback is the deliberate pattern used on every
    // connected page. The setState calls inside `load` are reachable only
    // after an await (or inside .catch), never synchronously in this
    // effect's own execution — the lint rule can't see through that.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load()
  }, [load])

  // A pure platform-admin (no merchant assignment) has nothing to render
  // here — this page is entirely merchant-scoped. Send them to their own
  // dashboard instead of reading merchant.* below, which would crash for
  // them. ProtectedRoute already guarantees that reaching this point with
  // merchant === null means the caller is a platform-admin (it blocks
  // everyone else), so no further role check is needed here.
  if (!merchant) {
    return <Navigate to={ROUTES.PLATFORM_DASHBOARD} replace />
  }

  if (state.status === 'error') {
    return <ErrorState description="We couldn't load your dashboard. Please try again." onRetry={load} />
  }

  const isLoading = state.status === 'loading'
  const data = state.data

  return (
    <>
      <WelcomeHeader
        ownerName={merchant.roleName === 'merchant-owner' ? 'Owner' : 'there'}
        businessName={merchant.businessName}
        businessType={data?.profile?.businessType}
        status={data?.profile?.status}
        country={data?.profile?.country}
        memberSince={
          data?.profile?.createdAt
            ? new Date(data.profile.createdAt).toLocaleDateString(undefined, { month: 'short', year: 'numeric' })
            : null
        }
      />

      <div className="animate-fade-in-up mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total Branches" value={isLoading ? '—' : data.branchCount} icon={MapPin} loading={isLoading} />
        <StatCard label="Devices" value={isLoading ? '—' : data.deviceCount} icon={Tablet} loading={isLoading} />
        <StatCard
          label="Device Health"
          value={isLoading ? '—' : `${data.deviceStatus.healthyPercent}%`}
          icon={HeartPulse}
          loading={isLoading}
        />
        <StatCard
          label="Active Subscriptions"
          value={isLoading ? '—' : data.activeSubscriptionCount}
          icon={Users}
          loading={isLoading}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="space-y-6 xl:col-span-2">
          <SectionCard
            title="Your Branches"
            description="Most recently added locations"
            action={
              <Link to={ROUTES.BRANCHES} className="text-sm font-medium text-brand-600 hover:text-brand-700 dark:text-brand-400 dark:hover:text-brand-300">
                View all
              </Link>
            }
          >
            {isLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, index) => (
                  <div key={index} className="h-12 animate-pulse rounded-lg bg-neutral-200/50 dark:bg-neutral-800/50" />
                ))}
              </div>
            ) : data.branches.length === 0 ? (
              <EmptyState
                icon={Building2}
                compact
                title="No branches yet"
                description="Add your first branch to see it here."
              />
            ) : (
              <div className="space-y-1">
                {data.branches.map((branch, index) => (
                  <div
                    key={branch.id}
                    className="-mx-2 flex items-center justify-between rounded-lg px-2 py-2.5 hover:bg-neutral-100/50 dark:hover:bg-neutral-900/50"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-neutral-100 dark:bg-neutral-800 text-[11px] font-semibold text-neutral-500 dark:text-neutral-400">
                        {index + 1}
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-neutral-900 dark:text-neutral-100">{branch.name}</p>
                        <p className="text-xs text-neutral-500">{branch.city}</p>
                      </div>
                    </div>
                    <Badge tone={BRANCH_STATUS_TONE[branch.status] ?? 'neutral'}>{branch.status}</Badge>
                  </div>
                ))}
              </div>
            )}
          </SectionCard>

          <SectionCard title="Membership Plans" description="Your active plan catalog">
            {isLoading ? (
              <div className="h-8 animate-pulse rounded-lg bg-neutral-200/50 dark:bg-neutral-800/50" />
            ) : (
              <div className="flex items-center justify-between">
                <p className="text-sm text-neutral-500 dark:text-neutral-400">
                  You have <span className="font-medium text-neutral-900 dark:text-neutral-100">{data.planCount}</span> membership plan
                  {data.planCount === 1 ? '' : 's'} configured.
                </p>
                <Link
                  to={ROUTES.MEMBERSHIP_PLANS}
                  className="text-sm font-medium text-brand-600 hover:text-brand-700 dark:text-brand-400 dark:hover:text-brand-300"
                >
                  Manage plans
                </Link>
              </div>
            )}
          </SectionCard>
        </div>

        <div className="space-y-6">
          <QuickActionsCard actions={QUICK_ACTIONS} loading={isLoading} />
          <DeviceStatusCard
            healthyPercent={isLoading ? 0 : data.deviceStatus.healthyPercent}
            breakdown={isLoading ? [] : data.deviceStatus.breakdown}
            loading={isLoading}
          />
        </div>
      </div>
    </>
  )
}
