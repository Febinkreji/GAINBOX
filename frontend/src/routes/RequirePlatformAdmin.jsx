import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { ROUTES } from '@/constants/routes'

/**
 * Guards the Platform Portal route group. Today the Platform sidebar
 * simply never links here for a non-admin, but a merchant-owner could
 * still type a /platform/* URL directly — the underlying API is already
 * requireRole('platform-admin')-gated on the backend, so this only makes
 * the frontend behavior match: a non-admin is sent back to their own
 * portal instead of rendering a page whose data calls will all 403.
 */
export default function RequirePlatformAdmin() {
  const { roles } = useAuth()

  if (!roles.includes('platform-admin')) {
    return <Navigate to={ROUTES.DASHBOARD} replace />
  }

  return <Outlet />
}
