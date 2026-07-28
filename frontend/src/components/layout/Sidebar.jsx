import { NavLink } from 'react-router-dom'
import { ChevronsLeft, ChevronsRight, X } from 'lucide-react'
import { NAV_ITEMS } from '@/constants/navigation'
import { APP_NAME, APP_TAGLINE } from '@/constants/app'
import { useSidebar } from '@/hooks/useSidebar'
import { cn } from '@/utils/cn'
import Logo from '@/components/ui/Logo'

function NavItems({ collapsed }) {
  return (
    <nav className="scrollbar-thin flex-1 space-y-1 overflow-y-auto px-3 py-4">
      {NAV_ITEMS.map(({ label, path, icon: Icon }) => (
        <NavLink
          key={path}
          to={path}
          end={path === '/'}
          className={({ isActive }) =>
            cn(
              'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
              isActive
                ? 'bg-brand-500/10 text-brand-400'
                : 'text-neutral-400 hover:bg-neutral-900 hover:text-neutral-100',
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

function BrandMark({ collapsed }) {
  return (
    <div className="flex h-16 items-center border-b border-neutral-900 px-4">
      {collapsed ? (
        <Logo variant="mark" alt={APP_NAME} className="h-8 w-8 shrink-0" />
      ) : (
        <div className="flex min-w-0 flex-col gap-1">
          <Logo variant="lockup" theme="dark" alt={APP_NAME} className="h-6 w-auto" />
          <p className="truncate text-xs text-neutral-500">{APP_TAGLINE}</p>
        </div>
      )}
    </div>
  )
}

export default function Sidebar() {
  const { collapsed, toggleCollapsed, mobileOpen, closeMobile } = useSidebar()

  return (
    <>
      <aside
        className={cn(
          'hidden shrink-0 flex-col border-r border-neutral-900 bg-neutral-950 transition-[width] duration-200 lg:flex',
          collapsed ? 'w-[76px]' : 'w-64',
        )}
      >
        <BrandMark collapsed={collapsed} />
        <NavItems collapsed={collapsed} />
        <div className="border-t border-neutral-900 p-3">
          <button
            type="button"
            onClick={toggleCollapsed}
            className="flex w-full items-center justify-center rounded-lg py-2 text-neutral-500 hover:bg-neutral-900 hover:text-neutral-200"
          >
            {collapsed ? <ChevronsRight size={18} /> : <ChevronsLeft size={18} />}
          </button>
        </div>
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={closeMobile} />
          <aside className="relative flex w-72 max-w-[80%] flex-col bg-neutral-950">
            <div className="flex h-16 items-center justify-between border-b border-neutral-900 px-4">
              <Logo variant="lockup" theme="dark" alt={APP_NAME} className="h-6 w-auto" />
              <button type="button" onClick={closeMobile} className="text-neutral-500 hover:text-neutral-200">
                <X size={20} />
              </button>
            </div>
            <NavItems collapsed={false} />
          </aside>
        </div>
      )}
    </>
  )
}
