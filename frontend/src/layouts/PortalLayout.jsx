import { Outlet } from 'react-router-dom'
import TopNavbar from '@/components/layout/TopNavbar'
import { SidebarProvider } from '@/context/SidebarProvider'

/**
 * The one shared structural shell both portals render inside — sidebar
 * slot, shared TopNavbar, content area. MerchantLayout/PlatformLayout are
 * thin compositions over this (their own Sidebar, their own search
 * placeholder, Platform's own breadcrumbs) rather than two copies of this
 * markup — see Part 5's "do not duplicate common UI".
 */
export default function PortalLayout({ sidebar, searchPlaceholder, breadcrumbs }) {
  return (
    <SidebarProvider>
      <div className="flex h-svh bg-white dark:bg-neutral-950">
        {sidebar}
        <div className="flex min-w-0 flex-1 flex-col">
          <TopNavbar searchPlaceholder={searchPlaceholder} />
          <main className="scrollbar-thin flex-1 overflow-y-auto px-6 py-6 lg:px-10 lg:py-8">
            <div className="mx-auto max-w-7xl">
              {breadcrumbs}
              <Outlet />
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  )
}
