import { MapPin } from 'lucide-react'
import PageHeader from '@/components/common/PageHeader'
import EmptyState from '@/components/common/EmptyState'

// Surfboard integration point: storeService (Store Capabilities) —
// see src/services/storeService.js.
export default function Branches() {
  return (
    <>
      <PageHeader
        title="Branches"
        description="Manage gym and outlet locations connected to your merchant account."
      />
      <EmptyState
        icon={MapPin}
        title="No branches added yet"
        description="Create and manage your business branches once Surfboard store management is connected."
      />
    </>
  )
}
