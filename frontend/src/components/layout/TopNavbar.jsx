import { Bell, Menu, Search } from 'lucide-react'
import { useSidebar } from '@/hooks/useSidebar'
import { useDisclosure } from '@/hooks/useDisclosure'
import Avatar from '@/components/ui/Avatar'

export default function TopNavbar() {
  const { openMobile } = useSidebar()
  const userMenu = useDisclosure()

  return (
    <header className="flex h-16 shrink-0 items-center gap-4 border-b border-neutral-900 bg-neutral-950/80 px-4 backdrop-blur lg:px-8">
      <button type="button" onClick={openMobile} className="text-neutral-400 hover:text-neutral-100 lg:hidden">
        <Menu size={20} />
      </button>

      <div className="hidden flex-1 items-center gap-2 rounded-lg border border-neutral-800 bg-neutral-900/60 px-3 py-2 text-sm text-neutral-500 sm:flex sm:max-w-sm">
        <Search size={16} />
        <span>Search merchants, branches, devices…</span>
      </div>

      <div className="ml-auto flex items-center gap-3">
        <button
          type="button"
          className="relative rounded-lg p-2 text-neutral-400 hover:bg-neutral-900 hover:text-neutral-100"
        >
          <Bell size={18} />
          <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-brand-500" />
        </button>

        <div className="relative">
          <button
            type="button"
            onClick={userMenu.toggle}
            className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-neutral-900"
          >
            <Avatar name="GainBox Merchant" />
          </button>

          {userMenu.isOpen && (
            <div className="absolute right-0 top-full mt-2 w-52 rounded-lg border border-neutral-800 bg-neutral-900 p-1 shadow-xl">
              <p className="px-3 py-2 text-xs text-neutral-500">Signed in as</p>
              <p className="truncate px-3 pb-2 text-sm text-neutral-200">merchant@gainbox.in</p>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
