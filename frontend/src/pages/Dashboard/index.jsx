import { useEffect, useState } from 'react'
import { CreditCard as CardIcon, QrCode, Wallet as WalletIcon } from 'lucide-react'
import { Link } from 'react-router-dom'
import SectionCard from '@/components/common/SectionCard'
import Badge from '@/components/ui/Badge'
import Skeleton from '@/components/ui/Skeleton'
import StatCard from '@/components/dashboard/StatCard'
import WelcomeHeader from '@/components/dashboard/WelcomeHeader'
import RevenueTrendCard from '@/components/dashboard/RevenueTrendCard'
import BranchPerformanceCard from '@/components/dashboard/BranchPerformanceCard'
import DeviceStatusCard from '@/components/dashboard/DeviceStatusCard'
import QuickActionsCard from '@/components/dashboard/QuickActionsCard'
import NotificationsCard from '@/components/dashboard/NotificationsCard'
import TasksCard from '@/components/dashboard/TasksCard'
import ActivityTimeline from '@/components/dashboard/ActivityTimeline'
import DataTable from '@/components/tables/DataTable'
import { ROUTES } from '@/constants/routes'
import {
  merchant,
  heroKpis,
  compactKpis,
  revenueTrend,
  branches,
  transactions,
  deviceStatus,
  quickActions,
  notifications,
  tasks,
  activity,
} from './dummyData'

const STATUS_TONE = { paid: 'success', pending: 'warning', refunded: 'neutral' }
const STATUS_LABEL = { paid: 'Paid', pending: 'Pending', refunded: 'Refunded' }
const METHOD_ICON = { Card: CardIcon, UPI: QrCode, Wallet: WalletIcon }

const TRANSACTION_COLUMNS = [
  { key: 'customer', header: 'Customer' },
  { key: 'plan', header: 'Plan' },
  { key: 'branch', header: 'Branch' },
  {
    key: 'method',
    header: 'Method',
    render: (row) => {
      const MethodIcon = METHOD_ICON[row.method] ?? CardIcon
      return (
        <span className="flex items-center gap-1.5 text-neutral-300">
          <MethodIcon size={14} strokeWidth={1.75} />
          {row.method}
        </span>
      )
    },
  },
  {
    key: 'amount',
    header: 'Amount',
    render: (row) => <span className="font-medium tabular-nums text-neutral-100">{row.amount}</span>,
  },
  {
    key: 'status',
    header: 'Status',
    render: (row) => <Badge tone={STATUS_TONE[row.status]}>{STATUS_LABEL[row.status]}</Badge>,
  },
  {
    key: 'time',
    header: 'Time',
    render: (row) => <span className="text-neutral-500">{row.time}</span>,
  },
]

// Data sources once implemented: storeService.listStores + listDevices
// (branch/device counts), paymentService (revenue, transactions, receipts).
// Everything below is illustrative dummy data — see src/services/*. The
// brief `isLoading` gate is a UI-only entrance treatment (skeletons +
// staggered fade-in), not a real network request.
export default function Dashboard() {
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const timeout = setTimeout(() => setIsLoading(false), 700)
    return () => clearTimeout(timeout)
  }, [])

  return (
    <>
      <WelcomeHeader {...merchant} />

      <div
        key={`hero-${isLoading}`}
        className="animate-fade-in-up mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
      >
        {heroKpis.map((kpi) => (
          <StatCard key={kpi.id} size="lg" loading={isLoading} {...kpi} />
        ))}
      </div>

      <div
        key={`compact-${isLoading}`}
        className="animate-fade-in-up mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3"
        style={{ animationDelay: '60ms' }}
      >
        {compactKpis.map((kpi) => (
          <StatCard key={kpi.id} loading={isLoading} {...kpi} />
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div key={`left-${isLoading}`} className="animate-fade-in-up space-y-6 xl:col-span-2" style={{ animationDelay: '100ms' }}>
          <RevenueTrendCard
            data={revenueTrend}
            currentValue="₹12.4L"
            changeLabel="+9.6% vs last month"
            loading={isLoading}
          />

          <BranchPerformanceCard branches={branches} loading={isLoading} />

          <SectionCard
            title="Recent Transactions"
            description="Latest membership and meal plan purchases"
            action={
              <Link
                to={ROUTES.PAYMENTS}
                className="text-sm font-medium text-brand-400 transition-colors hover:text-brand-300"
              >
                View all
              </Link>
            }
          >
            {isLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, index) => (
                  <Skeleton key={index} className="h-10 w-full" />
                ))}
              </div>
            ) : (
              <DataTable columns={TRANSACTION_COLUMNS} rows={transactions} />
            )}
          </SectionCard>
        </div>

        <div key={`right-${isLoading}`} className="animate-fade-in-up space-y-6" style={{ animationDelay: '150ms' }}>
          <QuickActionsCard actions={quickActions} loading={isLoading} />
          <DeviceStatusCard
            healthyPercent={deviceStatus.healthyPercent}
            breakdown={deviceStatus.breakdown}
            loading={isLoading}
          />
          <NotificationsCard notifications={notifications} loading={isLoading} />
          <TasksCard tasks={tasks} loading={isLoading} />
          <SectionCard title="Recent Activity" description="What's changed across your account">
            {isLoading ? (
              <div className="space-y-4">
                {Array.from({ length: 4 }).map((_, index) => (
                  <div key={index} className="flex items-center gap-3">
                    <Skeleton className="h-7 w-7 rounded-full" />
                    <Skeleton className="h-4 flex-1" />
                  </div>
                ))}
              </div>
            ) : (
              <ActivityTimeline items={activity} />
            )}
          </SectionCard>
        </div>
      </div>
    </>
  )
}
