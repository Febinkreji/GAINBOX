import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { ROUTES } from '@/constants/routes'

/**
 * Guards the Merchant Portal route group. A pure platform-admin (no
 * merchant assignment) has nothing to do on any merchant-scoped page —
 * several of them (Dashboard, Branches, Devices, Membership Plans) read
 * merchant.merchantId unconditionally and would crash the way
 * pages/Dashboard/index.jsx once did. ProtectedRoute (unmodified) already
 * guarantees that reaching this point with merchant === null means the
 * caller is a platform-admin — it blocks everyone else with an "invite
 * me" screen before this guard ever runs — so no separate role check is
 * needed here, only the same merchant !== null fact Dashboard's own guard
 * already relies on. This generalizes that one fix to the whole route
 * group instead of patching every merchant page individually.
 */
export default function RequireMerchantAccess() {
  const { merchant } = useAuth()

  if (!merchant) {
    return <Navigate to={ROUTES.PLATFORM_DASHBOARD} replace />
  }

  return <Outlet />
}
