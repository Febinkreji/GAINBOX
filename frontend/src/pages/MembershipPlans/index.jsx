import { Ticket } from 'lucide-react'
import PageHeader from '@/components/common/PageHeader'
import EmptyState from '@/components/common/EmptyState'

// Plan definitions are GainBox business data (no direct Surfboard mapping),
// but checkout on a plan will call paymentService (Make Your Payments) —
// see src/services/paymentService.js.
export default function MembershipPlans() {
  return (
    <>
      <PageHeader
        title="Membership Plans"
        description="Configure the fitness and wellness packages you offer customers."
      />
      <EmptyState
        icon={Ticket}
        title="No membership plans created yet"
        description="Build weight-loss, muscle-gain, and premium transformation packages here."
      />
    </>
  )
}
