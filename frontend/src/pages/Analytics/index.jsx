import { BarChart3 } from 'lucide-react'
import PageHeader from '@/components/common/PageHeader'
import EmptyState from '@/components/common/EmptyState'

// Analytics is derived data (aggregated payment/store/device activity), not
// a direct Surfboard capability — it will read from paymentService and
// storeService once those are backed by real Surfboard data.
export default function Analytics() {
  return (
    <>
      <PageHeader
        title="Analytics"
        description="Understand business performance across branches and membership plans."
      />
      <EmptyState
        icon={BarChart3}
        title="Analytics dashboards coming soon"
        description="Revenue, retention, and growth insights will be visualized here."
      />
    </>
  )
}
