import { ArrowRight, ShieldCheck, Sparkles } from 'lucide-react'
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

export default function WelcomeHeader({ ownerName, businessName, businessType, city, planTier, memberSince }) {
  return (
    <div className="animate-fade-in-up relative mb-8 overflow-hidden rounded-2xl border border-neutral-800 bg-neutral-900/50 px-6 py-7 shadow-premium sm:px-8">
      <div className="bg-radial-fade pointer-events-none absolute inset-0" />

      <div className="relative flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex gap-4">
          <div className="hidden shrink-0 rounded-full ring-2 ring-brand-500/30 ring-offset-2 ring-offset-neutral-900 sm:block">
            <Avatar name={businessName} size={52} />
          </div>

          <div>
            <p className="text-sm font-medium text-neutral-400">
              {getGreeting()}, {ownerName}
            </p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight text-neutral-50 sm:text-3xl">{businessName}</h1>

            <div className="mt-3 flex flex-wrap items-center gap-2 text-sm text-neutral-400">
              <span className="inline-flex items-center gap-1.5 text-emerald-400">
                <ShieldCheck size={14} strokeWidth={2} />
                Verified merchant
              </span>
              <span className="text-neutral-700">·</span>
              <span>{businessType}</span>
              <span className="text-neutral-700">·</span>
              <span>{city}</span>
              <span className="text-neutral-700">·</span>
              <span>Since {memberSince}</span>
              <Badge tone="brand">{planTier}</Badge>
            </div>
          </div>
        </div>

        <div className="flex shrink-0 flex-col items-start gap-3 sm:items-end">
          <Badge tone="neutral" className="flex items-center gap-1.5">
            <Sparkles size={12} />
            Preview data — Surfboard sync coming soon
          </Badge>
          <Link
            to={ROUTES.MERCHANT_PROFILE}
            className="group flex items-center gap-1 text-sm font-medium text-brand-400 transition-colors hover:text-brand-300"
          >
            Manage merchant profile
            <ArrowRight size={14} className="transition-transform duration-200 group-hover:translate-x-0.5" />
          </Link>
        </div>
      </div>
    </div>
  )
}
