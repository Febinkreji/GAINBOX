import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Bell,
  Check,
  ChevronRight,
  LogOut,
  Menu,
  Monitor,
  Moon,
  Search,
  Settings as SettingsIcon,
  Sun,
  User,
} from 'lucide-react'
import { useSidebar } from '@/hooks/useSidebar'
import { useDisclosure } from '@/hooks/useDisclosure'
import { useAuth } from '@/hooks/useAuth'
import { useTheme } from '@/hooks/useTheme'
import { ROUTES } from '@/constants/routes'
import { cn } from '@/utils/cn'
import Avatar from '@/components/ui/Avatar'

const THEME_OPTIONS = [
  { value: 'light', label: 'Light', icon: Sun },
  { value: 'dark', label: 'Dark', icon: Moon },
  { value: 'system', label: 'System', icon: Monitor },
]

export default function TopNavbar({ searchPlaceholder = 'Search…' }) {
  const { openMobile } = useSidebar()
  const userMenu = useDisclosure()
  const [themeSubmenuOpen, setThemeSubmenuOpen] = useState(false)
  const menuRef = useRef(null)
  const navigate = useNavigate()
  const { user, merchant, signOut } = useAuth()
  const { theme, setTheme } = useTheme()

  const displayName = user?.displayName || user?.email || 'User'
  const hasMerchantPages = Boolean(merchant)

  useEffect(() => {
    if (!userMenu.isOpen) {
      return undefined
    }

    function handlePointerDown(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        userMenu.close()
      }
    }

    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        userMenu.close()
      }
    }

    document.addEventListener('mousedown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userMenu.isOpen])

  async function handleSignOut() {
    userMenu.close()
    await signOut()
    navigate(ROUTES.LOGIN, { replace: true })
  }

  function goTo(path) {
    userMenu.close()
    navigate(path)
  }

  function toggleUserMenu() {
    // Reset here (on open/close), not via an effect watching
    // userMenu.isOpen — this is a plain UI-state reset triggered by a user
    // action, not a sync with an external system.
    setThemeSubmenuOpen(false)
    userMenu.toggle()
  }

  return (
    <header className="flex h-16 shrink-0 items-center gap-4 border-b border-neutral-200 bg-white/80 px-4 backdrop-blur dark:border-neutral-900 dark:bg-neutral-950/80 lg:px-8">
      <button
        type="button"
        onClick={openMobile}
        className="text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100 lg:hidden"
      >
        <Menu size={20} />
      </button>

      <div className="hidden flex-1 items-center gap-2 rounded-lg border border-neutral-200 bg-neutral-100/60 px-3 py-2 text-sm text-neutral-600 dark:border-neutral-800 dark:bg-neutral-900/60 dark:text-neutral-500 sm:flex sm:max-w-sm">
        <Search size={16} />
        <span>{searchPlaceholder}</span>
      </div>

      <div className="ml-auto flex items-center gap-3">
        <button
          type="button"
          className="relative rounded-lg p-2 text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-900 dark:hover:text-neutral-100"
        >
          <Bell size={18} />
          <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-brand-500" />
        </button>

        <div className="relative" ref={menuRef}>
          <button
            type="button"
            onClick={toggleUserMenu}
            className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-neutral-100 dark:hover:bg-neutral-900"
          >
            <Avatar name={displayName} />
          </button>

          {userMenu.isOpen && (
            <div
              role="menu"
              className="absolute right-0 top-full mt-2 w-60 rounded-lg border border-neutral-200 bg-white p-1 shadow-xl dark:border-neutral-800 dark:bg-neutral-900"
            >
              <p className="px-3 pt-2 text-xs text-neutral-500">Signed in as</p>
              <p className="truncate px-3 pb-2 text-sm text-neutral-800 dark:text-neutral-200">{user?.email}</p>
              <div className="my-1 border-t border-neutral-200 dark:border-neutral-800" />

              {hasMerchantPages && (
                <>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => goTo(ROUTES.MERCHANT_PROFILE)}
                    className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-neutral-700 hover:bg-neutral-100 hover:text-neutral-900 dark:text-neutral-300 dark:hover:bg-neutral-800 dark:hover:text-neutral-100"
                  >
                    <User size={15} />
                    Profile
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => goTo(ROUTES.SETTINGS)}
                    className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-neutral-700 hover:bg-neutral-100 hover:text-neutral-900 dark:text-neutral-300 dark:hover:bg-neutral-800 dark:hover:text-neutral-100"
                  >
                    <SettingsIcon size={15} />
                    Settings
                  </button>
                  <div className="my-1 border-t border-neutral-200 dark:border-neutral-800" />
                </>
              )}

              <button
                type="button"
                role="menuitem"
                aria-expanded={themeSubmenuOpen}
                onClick={() => setThemeSubmenuOpen((prev) => !prev)}
                className="flex w-full items-center justify-between rounded-md px-3 py-2 text-sm text-neutral-700 hover:bg-neutral-100 hover:text-neutral-900 dark:text-neutral-300 dark:hover:bg-neutral-800 dark:hover:text-neutral-100"
              >
                <span className="flex items-center gap-2">
                  <Monitor size={15} />
                  Theme
                </span>
                <ChevronRight size={14} className={cn('transition-transform', themeSubmenuOpen && 'rotate-90')} />
              </button>

              {themeSubmenuOpen && (
                <div className="ml-2 border-l border-neutral-200 pl-2 dark:border-neutral-800">
                  {THEME_OPTIONS.map((option) => {
                    const OptionIcon = option.icon
                    const isSelected = theme === option.value
                    return (
                      <button
                        key={option.value}
                        type="button"
                        role="menuitemradio"
                        aria-checked={isSelected}
                        onClick={() => setTheme(option.value)}
                        className="flex w-full items-center justify-between rounded-md px-3 py-2 text-sm text-neutral-700 hover:bg-neutral-100 hover:text-neutral-900 dark:text-neutral-300 dark:hover:bg-neutral-800 dark:hover:text-neutral-100"
                      >
                        <span className="flex items-center gap-2">
                          <OptionIcon size={14} />
                          {option.label}
                        </span>
                        {isSelected && <Check size={14} className="text-brand-500" />}
                      </button>
                    )
                  })}
                </div>
              )}

              <div className="my-1 border-t border-neutral-200 dark:border-neutral-800" />

              <button
                type="button"
                role="menuitem"
                onClick={handleSignOut}
                className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-neutral-700 hover:bg-neutral-100 hover:text-neutral-900 dark:text-neutral-300 dark:hover:bg-neutral-800 dark:hover:text-neutral-100"
              >
                <LogOut size={15} />
                Sign out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
