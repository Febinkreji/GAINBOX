import { Route, Routes } from 'react-router-dom'
import MainLayout from '@/layouts/MainLayout'
import { ROUTES } from '@/constants/routes'
import Dashboard from '@/pages/Dashboard'
import MerchantProfile from '@/pages/MerchantProfile'
import Branches from '@/pages/Branches'
import Devices from '@/pages/Devices'
import MembershipPlans from '@/pages/MembershipPlans'
import Payments from '@/pages/Payments'
import Analytics from '@/pages/Analytics'
import Settings from '@/pages/Settings'
import IntegrationCenter from '@/pages/IntegrationCenter'

export default function AppRoutes() {
  return (
    <Routes>
      <Route element={<MainLayout />}>
        <Route path={ROUTES.DASHBOARD} element={<Dashboard />} />
        <Route path={ROUTES.MERCHANT_PROFILE} element={<MerchantProfile />} />
        <Route path={ROUTES.BRANCHES} element={<Branches />} />
        <Route path={ROUTES.DEVICES} element={<Devices />} />
        <Route path={ROUTES.MEMBERSHIP_PLANS} element={<MembershipPlans />} />
        <Route path={ROUTES.PAYMENTS} element={<Payments />} />
        <Route path={ROUTES.ANALYTICS} element={<Analytics />} />
        <Route path={ROUTES.SETTINGS} element={<Settings />} />
        <Route path={ROUTES.INTEGRATION_CENTER} element={<IntegrationCenter />} />
      </Route>
    </Routes>
  )
}
