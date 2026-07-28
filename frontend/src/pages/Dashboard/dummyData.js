import {
  Building2,
  CreditCard,
  HeartPulse,
  IndianRupee,
  MapPin,
  ReceiptText,
  Tablet,
  Ticket,
  Users,
  Wallet,
  WifiOff,
} from 'lucide-react'
import { ROUTES } from '@/constants/routes'

/**
 * Illustrative dummy data for the Merchant Dashboard only. None of this is
 * fetched — it exists purely to demonstrate the intended visual density
 * ahead of real Surfboard/GainBox backend data (see src/services/*).
 */

export const merchant = {
  ownerName: 'Arjun',
  businessName: 'Iron Forge Fitness Group',
  businessType: 'Multi-branch Gym',
  city: 'Chennai',
  planTier: 'Growth Plan',
  memberSince: 'Jan 2025',
}

export const heroKpis = [
  {
    id: 'today-revenue',
    label: "Today's Revenue",
    value: '₹48,250',
    icon: IndianRupee,
    trend: { direction: 'up', label: '+18.2% vs yesterday' },
    sparkline: [30, 34, 31, 40, 37, 44, 48],
  },
  {
    id: 'monthly-revenue',
    label: 'Monthly Revenue',
    value: '₹12.4L',
    icon: Wallet,
    trend: { direction: 'up', label: '+9.6% vs last month' },
    sparkline: [8.1, 8.6, 9.3, 9.8, 10.6, 11.4, 12.4],
  },
  {
    id: 'active-memberships',
    label: 'Active Memberships',
    value: '1,284',
    icon: Users,
    trend: { direction: 'up', label: '+64 new this month' },
    sparkline: [1080, 1120, 1150, 1190, 1230, 1260, 1284],
  },
]

export const compactKpis = [
  { id: 'branches', label: 'Total Branches', value: '6', icon: Building2, hint: '1 new this quarter' },
  { id: 'terminals', label: 'Connected Terminals', value: '18', icon: Tablet, hint: '17 online now' },
  { id: 'device-health', label: 'Device Health', value: '94%', icon: HeartPulse, hint: '1 needs attention' },
]

export const revenueTrend = [
  { label: 'Feb', value: 7.8 },
  { label: 'Mar', value: 8.4 },
  { label: 'Apr', value: 8.1 },
  { label: 'May', value: 9.3 },
  { label: 'Jun', value: 9.8 },
  { label: 'Jul', value: 10.6 },
  { label: 'Aug', value: 11.4 },
  { label: 'Sep', value: 11.9 },
  { label: 'Oct', value: 12.4 },
  { label: 'Nov', value: 12.1 },
  { label: 'Dec', value: 12.9 },
  { label: 'Jan', value: 12.4 },
]

export const branches = [
  { id: 'br-1', name: 'Anna Nagar (HQ)', city: 'Chennai', members: 312, revenue: '₹3.8L', utilization: 82 },
  { id: 'br-2', name: 'T. Nagar', city: 'Chennai', members: 248, revenue: '₹2.9L', utilization: 74 },
  { id: 'br-3', name: 'Velachery', city: 'Chennai', members: 190, revenue: '₹2.1L', utilization: 68 },
  { id: 'br-4', name: 'OMR', city: 'Chennai', members: 145, revenue: '₹1.6L', utilization: 55 },
  { id: 'br-5', name: 'Adyar', city: 'Chennai', members: 98, revenue: '₹1.2L', utilization: 41 },
  { id: 'br-6', name: 'Whitefield', city: 'Bengaluru', members: 22, revenue: '₹34K', utilization: 12, isNew: true },
]

export const transactions = [
  { id: 'txn-1', customer: 'Priya S.', plan: 'Muscle Gain Package', branch: 'Anna Nagar', method: 'Card', amount: '₹2,499', status: 'paid', time: '2 min ago' },
  { id: 'txn-2', customer: 'Rahul K.', plan: 'Weight Loss Package', branch: 'T. Nagar', method: 'UPI', amount: '₹1,999', status: 'paid', time: '18 min ago' },
  { id: 'txn-3', customer: 'Meena R.', plan: 'Premium Transformation', branch: 'Velachery', method: 'Card', amount: '₹4,999', status: 'paid', time: '41 min ago' },
  { id: 'txn-4', customer: 'Karthik V.', plan: 'Maintenance Package', branch: 'OMR', method: 'Wallet', amount: '₹1,499', status: 'refunded', time: '1 hr ago' },
  { id: 'txn-5', customer: 'Divya N.', plan: 'Nutrition Consultation', branch: 'Anna Nagar', method: 'UPI', amount: '₹999', status: 'pending', time: '2 hr ago' },
  { id: 'txn-6', customer: 'Suresh B.', plan: 'Muscle Gain Package', branch: 'Adyar', method: 'Card', amount: '₹2,499', status: 'paid', time: '3 hr ago' },
]

export const deviceStatus = {
  healthyPercent: 94,
  breakdown: [
    { label: 'Online', count: 15, dotClass: 'bg-emerald-400', live: true },
    { label: 'Needs attention', count: 2, dotClass: 'bg-amber-400' },
    { label: 'Offline', count: 1, dotClass: 'bg-red-400' },
  ],
}

export const quickActions = [
  { label: 'Add Branch', icon: MapPin, to: ROUTES.BRANCHES },
  { label: 'Register Device', icon: Tablet, to: ROUTES.DEVICES },
  { label: 'Create Plan', icon: Ticket, to: ROUTES.MEMBERSHIP_PLANS },
  { label: 'View Payments', icon: CreditCard, to: ROUTES.PAYMENTS },
]

export const notifications = [
  {
    id: 'n1',
    message: 'Payment terminal at OMR branch went offline',
    time: '12 min ago',
    icon: WifiOff,
    iconBg: 'bg-red-500/10',
    iconColor: 'text-red-400',
    unread: true,
  },
  {
    id: 'n2',
    message: "New membership plan 'Athlete Performance' is ready to publish",
    time: '1 hr ago',
    icon: Ticket,
    iconBg: 'bg-brand-500/10',
    iconColor: 'text-brand-400',
    unread: true,
  },
  {
    id: 'n3',
    message: 'Weekly settlement of ₹8.4L has been processed',
    time: '3 hr ago',
    icon: ReceiptText,
    iconBg: 'bg-emerald-500/10',
    iconColor: 'text-emerald-400',
    unread: false,
  },
  {
    id: 'n4',
    message: 'Whitefield branch onboarding is 80% complete',
    time: 'Yesterday',
    icon: Building2,
    iconBg: 'bg-neutral-800',
    iconColor: 'text-neutral-400',
    unread: false,
  },
]

export const tasks = [
  { id: 't1', title: 'Review refund request from Karthik V.', due: 'Due today', urgent: true },
  { id: 't2', title: 'Approve KYC documents for Whitefield branch', due: 'Due tomorrow', urgent: false },
  { id: 't3', title: 'Renew payment terminal lease — Anna Nagar', due: 'Due in 3 days', urgent: false },
  { id: 't4', title: "Publish 'Athlete Performance' membership plan", due: 'Due in 5 days', urgent: false },
]

export const activity = [
  { id: 'a1', title: "New branch 'Whitefield' added to your account", time: '2 hours ago', icon: MapPin },
  { id: 'a2', title: 'Device terminal SB-2201 reassigned to T. Nagar', time: '5 hours ago', icon: Tablet },
  { id: 'a3', title: 'Merchant profile branding updated', time: 'Yesterday', icon: Building2 },
  { id: 'a4', title: 'New payment terminal registered at Velachery', time: '2 days ago', icon: CreditCard },
  { id: 'a5', title: "Membership plan 'Maintenance Package' pricing updated", time: '3 days ago', icon: Ticket },
]
