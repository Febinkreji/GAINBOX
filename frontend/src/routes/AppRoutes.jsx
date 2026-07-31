import { Route, Routes } from 'react-router-dom'
import MerchantLayout from '@/layouts/MerchantLayout'
import PlatformLayout from '@/layouts/PlatformLayout'
import ProtectedRoute from '@/routes/ProtectedRoute'
import RequireMerchantAccess from '@/routes/RequireMerchantAccess'
import RequirePlatformAdmin from '@/routes/RequirePlatformAdmin'
import { ROUTES } from '@/constants/routes'
import Login from '@/pages/Login'
import AcceptInvitation from '@/pages/AcceptInvitation'
import Dashboard from '@/pages/Dashboard'
import MerchantProfile from '@/pages/MerchantProfile'
import Branches from '@/pages/Branches'
import Devices from '@/pages/Devices'
import MembershipPlans from '@/pages/MembershipPlans'
import Staff from '@/pages/Staff'
import Payments from '@/pages/Payments'
import Analytics from '@/pages/Analytics'
import Settings from '@/pages/Settings'
import IntegrationCenter from '@/pages/IntegrationCenter'
import PlatformDashboard from '@/pages/Platform/Dashboard'
import PlatformMerchantManagement from '@/pages/Platform/MerchantManagement'
import PlatformMerchantDetails from '@/pages/Platform/MerchantDetails'
import PlatformUserManagement from '@/pages/Platform/UserManagement'
import PlatformUserDetails from '@/pages/Platform/UserDetails'
import PlatformInvitations from '@/pages/Platform/Invitations'

/**
 * Two independent, guarded route groups — one per portal — both nested
 * under the same (unmodified) ProtectedRoute, which still owns all of
 * "signed in?"/"has any access at all?". Everything below that is purely
 * about *which* portal: RequireMerchantAccess/RequirePlatformAdmin pick the
 * group, and each group's own Layout renders its own Sidebar. No route is
 * defined twice, and no authorization rule is duplicated — both guards
 * read the exact same `merchant`/`roles` ProtectedRoute already computed.
 */
export default function AppRoutes() {
  return (
    <Routes>
      <Route path={ROUTES.LOGIN} element={<Login />} />
      {/* Top-level, like /login — not nested under ProtectedRoute. It
          must handle "not signed in yet" itself, without ever navigating
          away from this URL (that would lose ?token=). */}
      <Route path={ROUTES.ACCEPT_INVITATION} element={<AcceptInvitation />} />

      <Route element={<ProtectedRoute />}>
        <Route element={<RequireMerchantAccess />}>
          <Route element={<MerchantLayout />}>
            <Route path={ROUTES.DASHBOARD} element={<Dashboard />} />
            <Route path={ROUTES.MERCHANT_PROFILE} element={<MerchantProfile />} />
            <Route path={ROUTES.BRANCHES} element={<Branches />} />
            <Route path={ROUTES.DEVICES} element={<Devices />} />
            <Route path={ROUTES.MEMBERSHIP_PLANS} element={<MembershipPlans />} />
            <Route path={ROUTES.STAFF} element={<Staff />} />
            <Route path={ROUTES.PAYMENTS} element={<Payments />} />
            <Route path={ROUTES.ANALYTICS} element={<Analytics />} />
            <Route path={ROUTES.SETTINGS} element={<Settings />} />
            <Route path={ROUTES.INTEGRATION_CENTER} element={<IntegrationCenter />} />
          </Route>
        </Route>

        <Route element={<RequirePlatformAdmin />}>
          <Route element={<PlatformLayout />}>
            <Route path={ROUTES.PLATFORM_DASHBOARD} element={<PlatformDashboard />} />
            <Route path={ROUTES.PLATFORM_MERCHANTS} element={<PlatformMerchantManagement />} />
            <Route path={ROUTES.PLATFORM_MERCHANT_DETAILS} element={<PlatformMerchantDetails />} />
            <Route path={ROUTES.PLATFORM_USERS} element={<PlatformUserManagement />} />
            <Route path={ROUTES.PLATFORM_USER_DETAILS} element={<PlatformUserDetails />} />
            <Route path={ROUTES.PLATFORM_INVITATIONS} element={<PlatformInvitations />} />
          </Route>
        </Route>
      </Route>
    </Routes>
  )
}
