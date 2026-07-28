import { CreditCard } from 'lucide-react'
import PageHeader from '@/components/common/PageHeader'
import EmptyState from '@/components/common/EmptyState'

// Surfboard integration point: paymentService (Make Your Payments,
// Additional Payment Methods, Additional Operations, Receipts) —
// see src/services/paymentService.js.
export default function Payments() {
  return (
    <>
      <PageHeader
        title="Payments"
        description="Track transactions processed through Surfboard's payment infrastructure."
      />
      <EmptyState
        icon={CreditCard}
        title="No payment activity yet"
        description="Transaction history, receipts, and refunds will be available once payments go live."
      />
    </>
  )
}
