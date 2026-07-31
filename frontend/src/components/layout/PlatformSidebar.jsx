import SidebarShell from '@/components/layout/SidebarShell'
import { PLATFORM_NAV_ITEMS } from '@/constants/navigation'

export default function PlatformSidebar() {
  return <SidebarShell navItems={PLATFORM_NAV_ITEMS} tagline="Platform Portal" />
}
