import { ArrowRight, ShieldCheck, ShieldAlert, ShieldX, Sparkles } from 'lucide-react'
import { Link } from 'react-router-dom'
import Avatar from '@/components/ui/Avatar'
import Badge from '@/components/ui/Badge'
import { ROUTES } from '@/constants/routes'

function getGreeting() {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  return 'Good evening'
}

const STATUS_META = {
  active: { label: 'Active merchant', icon: ShieldCheck, className: 'text-emerald-600 dark:text-emerald-400' },
  pending: { label: 'Pending verification', icon: ShieldAlert, className: 'text-amber-600 dark:text-amber-400' },
  suspended: { label: 'Suspended', icon: ShieldX, className: 'text-red-600 dark:text-red-400' },
}

export default function WelcomeHeader({ ownerName, businessName, businessType, status, country, memberSince }) {
  const statusMeta = STATUS_META[status] ?? STATUS_META.pending
  const StatusIcon = statusMeta.icon

  return (
    <div className="animate-fade-in-up relative mb-8 overflow-hidden rounded-2xl border border-neutral-200 bg-neutral-50 px-6 py-7 shadow-premium dark:border-neutral-800 dark:bg-neutral-900/50 sm:px-8">
      <div className="bg-radial-fade pointer-events-none absolute inset-0" />

      <div className="relative flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex gap-4">
          <div className="hidden shrink-0 rounded-full ring-2 ring-brand-500/30 ring-offset-2 ring-offset-neutral-50 dark:ring-offset-neutral-900 sm:block">
            <Avatar name={businessName} size={52} />
          </div>

          <div>
            <p className="text-sm font-medium text-neutral-500 dark:text-neutral-400">
              {getGreeting()}, {ownerName}
            </p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight text-neutral-950 dark:text-neutral-50 sm:text-3xl">
              {businessName}
            </h1>

            <div className="mt-3 flex flex-wrap items-center gap-2 text-sm text-neutral-500 dark:text-neutral-400">
              <span className={`inline-flex items-center gap-1.5 ${statusMeta.className}`}>
                <StatusIcon size={14} strokeWidth={2} />
                {statusMeta.label}
              </span>
              {businessType && (
                <>
                  <span className="text-neutral-300 dark:text-neutral-700">·</span>
                  <span className="capitalize">{businessType.replace(/-/g, ' ')}</span>
                </>
              )}
              {country && (
                <>
                  <span className="text-neutral-300 dark:text-neutral-700">·</span>
                  <span>{country}</span>
                </>
              )}
              {memberSince && (
                <>
                  <span className="text-neutral-300 dark:text-neutral-700">·</span>
                  <span>Since {memberSince}</span>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="flex shrink-0 flex-col items-start gap-3 sm:items-end">
          <Badge tone="neutral" className="flex items-center gap-1.5">
            <Sparkles size={12} />
            Surfboard sync coming soon
          </Badge>
          <Link
            to={ROUTES.MERCHANT_PROFILE}
            className="group flex items-center gap-1 text-sm font-medium text-brand-600 transition-colors hover:text-brand-700 dark:text-brand-400 dark:hover:text-brand-300"
          >
            Manage merchant profile
            <ArrowRight size={14} className="transition-transform duration-200 group-hover:translate-x-0.5" />
          </Link>
        </div>
      </div>
    </div>
  )
}
