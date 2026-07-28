import { Outlet } from 'react-router-dom'
import Sidebar from '@/components/layout/Sidebar'
import TopNavbar from '@/components/layout/TopNavbar'
import { SidebarProvider } from '@/context/SidebarProvider'

export default function MainLayout() {
  return (
    <SidebarProvider>
      <div className="flex h-svh bg-neutral-950">
        <Sidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          <TopNavbar />
          <main className="scrollbar-thin flex-1 overflow-y-auto px-6 py-6 lg:px-10 lg:py-8">
            <div className="mx-auto max-w-7xl">
              <Outlet />
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  )
}
