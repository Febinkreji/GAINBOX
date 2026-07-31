import {
  LayoutDashboard,
  Building2,
  MapPin,
  Tablet,
  Ticket,
  CreditCard,
  BarChart3,
  Settings,
  Users,
  UserCog,
  Mail,
} from 'lucide-react'
import { ROUTES } from '@/constants/routes'

// Two structurally separate navigation lists — one per portal — instead of
// one flat, role-filtered array. This is what actually stops "mixed
// navigation": a Merchant Sidebar physically cannot render a Platform item
// because it never receives PLATFORM_NAV_ITEMS, and vice versa (see
// components/layout/MerchantSidebar.jsx / PlatformSidebar.jsx). Route-level
// guards (routes/RequireMerchantAccess.jsx, routes/RequirePlatformAdmin.jsx)
// are what actually keep a user out of the other portal's pages — these
// arrays only control what a nav link shows, not what's reachable.
//
// `roles` on an item is still used, but only for *within-portal* visibility
// (e.g. Staff is merchant-owner only among merchant users) — never for
// cross-portal filtering anymore.
export const MERCHANT_NAV_ITEMS = [
  { label: 'Dashboard', path: ROUTES.DASHBOARD, icon: LayoutDashboard },
  { label: 'Merchant Profile', path: ROUTES.MERCHANT_PROFILE, icon: Building2 },
  { label: 'Branches', path: ROUTES.BRANCHES, icon: MapPin },
  { label: 'Devices', path: ROUTES.DEVICES, icon: Tablet },
  { label: 'Membership Plans', path: ROUTES.MEMBERSHIP_PLANS, icon: Ticket },
  { label: 'Staff', path: ROUTES.STAFF, icon: Users, roles: ['merchant-owner'] },
  { label: 'Payments', path: ROUTES.PAYMENTS, icon: CreditCard },
  { label: 'Analytics', path: ROUTES.ANALYTICS, icon: BarChart3 },
  { label: 'Settings', path: ROUTES.SETTINGS, icon: Settings },
]

// Merchant/User Details are deliberately NOT listed here: they're reached
// only by clicking a row in Merchants/Users (see platformMerchantDetailsPath/
// platformUserDetailsPath in constants/routes.js) — a detail page, not a nav
// destination, same pattern the Merchant Portal's IntegrationCenter already
// established. "Platform Analytics"/"Platform Settings" are intentionally
// absent too — no such pages exist yet, and this sprint adds no new pages.
export const PLATFORM_NAV_ITEMS = [
  { label: 'Dashboard', path: ROUTES.PLATFORM_DASHBOARD, icon: LayoutDashboard },
  { label: 'Merchants', path: ROUTES.PLATFORM_MERCHANTS, icon: Building2 },
  { label: 'Users', path: ROUTES.PLATFORM_USERS, icon: UserCog },
  { label: 'Invitations', path: ROUTES.PLATFORM_INVITATIONS, icon: Mail },
]
