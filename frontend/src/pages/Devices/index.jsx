import { Tablet } from 'lucide-react'
import PageHeader from '@/components/common/PageHeader'
import EmptyState from '@/components/common/EmptyState'

// Surfboard integration point: deviceService (Device Management, Device
// Handling, Configure Branding, Configure Tips) and logisticsService
// (Logistics — terminal ordering) — see src/services/deviceService.js
// and src/services/logisticsService.js.
export default function Devices() {
  return (
    <>
      <PageHeader
        title="Devices"
        description="Register and manage payment terminals across your branches."
      />
      <EmptyState
        icon={Tablet}
        title="No devices registered yet"
        description="Payment terminal registration and lifecycle management will appear here."
      />
    </>
  )
}
