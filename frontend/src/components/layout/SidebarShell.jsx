import { NavLink } from 'react-router-dom'
import { ChevronsLeft, ChevronsRight, X } from 'lucide-react'
import { APP_NAME } from '@/constants/app'
import { useSidebar } from '@/hooks/useSidebar'
import { useAuth } from '@/hooks/useAuth'
import { useTheme } from '@/hooks/useTheme'
import { cn } from '@/utils/cn'
import Logo from '@/components/ui/Logo'

/**
 * Shared rendering for both portals' sidebars — brand mark, nav list,
 * collapse toggle, mobile drawer. MerchantSidebar/PlatformSidebar are thin
 * wrappers that each pass their own `navItems`/`tagline`; nothing about
 * *which* items or portal name renders lives here, so there is exactly one
 * place that draws a sidebar, not two near-identical copies.
 */

function NavItems({ navItems, collapsed }) {
  const { roles } = useAuth()
  // Still per-item role filtering, but now only ever *within* one portal's
  // own list (e.g. Staff is merchant-owner only among merchant nav items) —
  // never across portals, since each Sidebar only ever receives one
  // portal's array to begin with.
  const visibleItems = navItems.filter((item) => !item.roles || item.roles.some((role) => roles.includes(role)))

  return (
    <nav className="scrollbar-thin flex-1 space-y-1 overflow-y-auto px-3 py-4">
      {visibleItems.map(({ label, path, icon: Icon }) => (
        <NavLink
          key={path}
          to={path}
          end={path === '/'}
          className={({ isActive }) =>
            cn(
              'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
              isActive
                ? 'bg-brand-500/10 text-brand-600 dark:text-brand-400'
                : 'text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-900 dark:hover:text-neutral-100',
            )
          }
        >
          <Icon size={18} strokeWidth={1.75} className="shrink-0" />
          {!collapsed && <span className="truncate">{label}</span>}
        </NavLink>
      ))}
    </nav>
  )
}

function BrandMark({ collapsed, tagline }) {
  const { resolvedTheme } = useTheme()

  return (
    <div className="flex h-16 items-center border-b border-neutral-200 px-4 dark:border-neutral-900">
      {collapsed ? (
        <Logo variant="mark" alt={APP_NAME} className="h-8 w-8 shrink-0" />
      ) : (
        <div className="flex min-w-0 flex-col gap-1">
          <Logo variant="lockup" theme={resolvedTheme} className="h-6 w-auto" />
          <p className="truncate text-xs text-neutral-500">{tagline}</p>
        </div>
      )}
    </div>
  )
}

export default function SidebarShell({ navItems, tagline }) {
  const { collapsed, toggleCollapsed, mobileOpen, closeMobile } = useSidebar()
  const { resolvedTheme } = useTheme()

  return (
    <>
      <aside
        className={cn(
          'hidden shrink-0 flex-col border-r border-neutral-200 bg-white transition-[width] duration-200 dark:border-neutral-900 dark:bg-neutral-950 lg:flex',
          collapsed ? 'w-[76px]' : 'w-64',
        )}
      >
        <BrandMark collapsed={collapsed} tagline={tagline} />
        <NavItems navItems={navItems} collapsed={collapsed} />
        <div className="border-t border-neutral-200 p-3 dark:border-neutral-900">
          <button
            type="button"
            onClick={toggleCollapsed}
            className="flex w-full items-center justify-center rounded-lg py-2 text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900 dark:hover:bg-neutral-900 dark:hover:text-neutral-200"
          >
            {collapsed ? <ChevronsRight size={18} /> : <ChevronsLeft size={18} />}
          </button>
        </div>
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={closeMobile} />
          <aside className="relative flex w-72 max-w-[80%] flex-col bg-white dark:bg-neutral-950">
            <div className="flex h-16 items-center justify-between border-b border-neutral-200 px-4 dark:border-neutral-900">
              <Logo variant="lockup" theme={resolvedTheme} className="h-6 w-auto" />
              <button
                type="button"
                onClick={closeMobile}
                className="text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-200"
              >
                <X size={20} />
              </button>
            </div>
            <NavItems navItems={navItems} collapsed={false} />
          </aside>
        </div>
      )}
    </>
  )
}
