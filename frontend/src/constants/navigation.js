import {
  LayoutDashboard,
  Building2,
  MapPin,
  Tablet,
  Ticket,
  CreditCard,
  BarChart3,
  Settings,
} from 'lucide-react'
import { ROUTES } from '@/constants/routes'

export const NAV_ITEMS = [
  { label: 'Dashboard', path: ROUTES.DASHBOARD, icon: LayoutDashboard },
  { label: 'Merchant Profile', path: ROUTES.MERCHANT_PROFILE, icon: Building2 },
  { label: 'Branches', path: ROUTES.BRANCHES, icon: MapPin },
  { label: 'Devices', path: ROUTES.DEVICES, icon: Tablet },
  { label: 'Membership Plans', path: ROUTES.MEMBERSHIP_PLANS, icon: Ticket },
  { label: 'Payments', path: ROUTES.PAYMENTS, icon: CreditCard },
  { label: 'Analytics', path: ROUTES.ANALYTICS, icon: BarChart3 },
  { label: 'Settings', path: ROUTES.SETTINGS, icon: Settings },
]
