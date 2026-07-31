import SidebarShell from '@/components/layout/SidebarShell'
import { MERCHANT_NAV_ITEMS } from '@/constants/navigation'

export default function MerchantSidebar() {
  return <SidebarShell navItems={MERCHANT_NAV_ITEMS} tagline="Merchant Portal" />
}
