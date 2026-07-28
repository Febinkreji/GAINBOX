import { Building2 } from 'lucide-react'
import PageHeader from '@/components/common/PageHeader'
import EmptyState from '@/components/common/EmptyState'

// Surfboard integration point: merchantService (Merchant Creation, Merchant
// Functions, Multi Merchant Group) — see src/services/merchantService.js.
export default function MerchantProfile() {
  return (
    <>
      <PageHeader
        title="Merchant Profile"
        description="Manage your business identity, contact details, and branding."
      />
      <EmptyState
        icon={Building2}
        title="Merchant profile management coming soon"
        description="Business details, branding, and Surfboard merchant information will appear here."
      />
    </>
  )
}
