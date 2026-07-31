import PortalLayout from '@/layouts/PortalLayout'
import MerchantSidebar from '@/components/layout/MerchantSidebar'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'

export default function MerchantLayout() {
  useDocumentTitle('GainBox — Merchant Portal')

  return <PortalLayout sidebar={<MerchantSidebar />} searchPlaceholder="Search merchants, branches, devices…" />
}
