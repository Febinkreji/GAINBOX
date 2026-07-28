import { useState } from 'react'
import { SidebarContext } from '@/context/SidebarContext'

export function SidebarProvider({ children }) {
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  const value = {
    collapsed,
    toggleCollapsed: () => setCollapsed((prev) => !prev),
    mobileOpen,
    openMobile: () => setMobileOpen(true),
    closeMobile: () => setMobileOpen(false),
  }

  return <SidebarContext.Provider value={value}>{children}</SidebarContext.Provider>
}
