import { ArrowRight, CheckCircle2, Clock, Settings as SettingsIcon, ShieldCheck, Zap } from 'lucide-react'
import { Link } from 'react-router-dom'
import PageHeader from '@/components/common/PageHeader'
import EmptyState from '@/components/common/EmptyState'
import Badge from '@/components/ui/Badge'
import { ROUTES } from '@/constants/routes'

const CONNECTED_FEATURES = ['Merchant Management', 'Branch Management', 'Device Management', 'Payments', 'Receipts']

// Merchant-facing summary only. The full Surfboard capability registry and
// its per-capability statuses live in the Integration Center (see
// src/constants/surfboard.js and src/pages/IntegrationCenter) — a separate
// developer-facing page reached via "View Technical Details" below. Merchants
// shouldn't need to understand Surfboard as internal payment infrastructure.
export default function Settings() {
  return (
    <>
      <PageHeader
        title="Settings"
        description="Configure account preferences and platform integrations."
      />

      <div className="mb-8 overflow-hidden rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-neutral-100/40 dark:bg-neutral-900/40">
        <div className="flex items-center justify-between gap-4 border-b border-neutral-200/80 dark:border-neutral-800/80 px-6 py-4">
          <div>
            <h2 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">Surfboard Payments</h2>
            <p className="mt-0.5 text-xs text-neutral-500">Your payment infrastructure, powered by Surfboard.</p>
          </div>
          <Badge tone="success" className="flex shrink-0 items-center gap-1.5">
            <ShieldCheck size={12} />
            Connected (Sandbox)
          </Badge>
        </div>

        <div className="grid grid-cols-1 gap-6 px-6 py-5 sm:grid-cols-3">
          <div>
            <p className="text-xs text-neutral-500">Merchant Account</p>
            <p className="mt-1 text-sm font-medium text-neutral-900 dark:text-neutral-100">Configured</p>
          </div>
          <div>
            <p className="text-xs text-neutral-500">API Health</p>
            <p className="mt-1 flex items-center gap-1.5 text-sm font-medium text-emerald-600 dark:text-emerald-400">
              <Zap size={14} />
              Healthy
            </p>
          </div>
          <div>
            <p className="text-xs text-neutral-500">Last Synchronization</p>
            <p className="mt-1 flex items-center gap-1.5 text-sm font-medium text-neutral-900 dark:text-neutral-100">
              <Clock size={14} className="text-neutral-500" />
              2 minutes ago
            </p>
          </div>
        </div>

        <div className="border-t border-neutral-200/80 dark:border-neutral-800/80 px-6 py-5">
          <p className="mb-3 text-xs font-medium text-neutral-500">Connected Features</p>
          <div className="grid grid-cols-1 gap-x-6 gap-y-2 sm:grid-cols-2">
            {CONNECTED_FEATURES.map((feature) => (
              <div key={feature} className="flex items-center gap-2 text-sm text-neutral-300 dark:text-neutral-600 dark:text-neutral-300">
                <CheckCircle2 size={15} className="shrink-0 text-emerald-600 dark:text-emerald-400" />
                {feature}
              </div>
            ))}
          </div>
        </div>

        <div className="border-t border-neutral-200/80 dark:border-neutral-800/80 px-6 py-3.5">
          <Link
            to={ROUTES.INTEGRATION_CENTER}
            className="group flex items-center gap-1 text-sm font-medium text-brand-600 transition-colors hover:text-brand-700 dark:text-brand-400 dark:hover:text-brand-300"
          >
            View Technical Details
            <ArrowRight size={14} className="transition-transform duration-200 group-hover:translate-x-0.5" />
          </Link>
        </div>
      </div>

      <EmptyState
        icon={SettingsIcon}
        title="Account settings coming soon"
        description="Account, notification, and general preferences will be managed here."
      />
    </>
  )
}
