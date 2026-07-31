import { Link, useLocation, useParams } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'
import { ROUTES } from '@/constants/routes'

/**
 * Lightweight, path-derived breadcrumb trail for the Platform Layout only
 * (Part 2's "Platform Breadcrumbs") — no routing library addition, no
 * per-page config: it just reads the current location and a static
 * section map. Detail pages (Merchant/User Details) add one trailing
 * "Details" crumb since their own title already names the specific record.
 */
export default function PlatformBreadcrumbs() {
  const { pathname } = useLocation()
  const params = useParams()

  const segments = [{ label: 'Platform', to: ROUTES.PLATFORM_DASHBOARD }]

  if (pathname.startsWith('/platform/merchants')) {
    segments.push({ label: 'Merchants', to: ROUTES.PLATFORM_MERCHANTS })
    if (params.merchantId) segments.push({ label: 'Details' })
  } else if (pathname.startsWith('/platform/users')) {
    segments.push({ label: 'Users', to: ROUTES.PLATFORM_USERS })
    if (params.userId) segments.push({ label: 'Details' })
  } else if (pathname.startsWith('/platform/invitations')) {
    segments.push({ label: 'Invitations' })
  }

  return (
    <nav className="mb-4 flex items-center gap-1.5 text-sm">
      {segments.map((segment, index) => {
        const isLast = index === segments.length - 1
        return (
          <span key={`${segment.label}-${index}`} className="flex items-center gap-1.5">
            {index > 0 && <ChevronRight size={14} className="text-neutral-300 dark:text-neutral-700" />}
            {segment.to && !isLast ? (
              <Link to={segment.to} className="text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300">
                {segment.label}
              </Link>
            ) : (
              <span className={isLast ? 'text-neutral-600 dark:text-neutral-300' : 'text-neutral-500'}>
                {segment.label}
              </span>
            )}
          </span>
        )
      })}
    </nav>
  )
}
