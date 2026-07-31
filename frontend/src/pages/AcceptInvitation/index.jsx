import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { AlertCircle } from 'lucide-react'
import Logo from '@/components/ui/Logo'
import Button from '@/components/ui/Button'
import Badge from '@/components/ui/Badge'
import Skeleton from '@/components/ui/Skeleton'
import { APP_TAGLINE } from '@/constants/app'
import { ROUTES } from '@/constants/routes'
import { useAuth } from '@/hooks/useAuth'
import { useTheme } from '@/hooks/useTheme'
import { previewInvitation, acceptInvitation } from '@/services/authService'

const STATUS_TONE = { pending: 'brand', accepted: 'success', expired: 'neutral', revoked: 'danger' }

function CenteredCard({ children }) {
  const { resolvedTheme } = useTheme()

  return (
    <div className="flex h-svh items-center justify-center bg-white px-4 dark:bg-neutral-950">
      <div className="w-full max-w-sm rounded-2xl border border-neutral-200 bg-neutral-50 p-8 text-center shadow-xl dark:border-neutral-800 dark:bg-neutral-900/40">
        <Logo variant="lockup" theme={resolvedTheme} className="mx-auto h-8 w-auto" />
        <p className="mt-2 text-sm text-neutral-500">{APP_TAGLINE}</p>
        {children}
      </div>
    </div>
  )
}

/**
 * The shareable-invitation-link landing page (see
 * constants/routes.js's invitationAcceptanceLink). Deliberately a
 * top-level route, not nested under ProtectedRoute — it has to handle
 * "not signed in yet" itself, and must never navigate away from this URL
 * while doing so, or the ?token= in it would be lost. Google Sign-In here
 * uses the same signInWithPopup() as Login.jsx (unmodified,
 * AuthProvider.jsx untouched) — a popup never navigates the underlying
 * page, so the token simply stays in the URL through the whole sign-in,
 * no redirect-and-restore plumbing needed.
 */
export default function AcceptInvitation() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token')
  const navigate = useNavigate()
  const { loading, isAuthenticated, signInWithGoogle, signOut, refreshUser } = useAuth()

  const [isSigningIn, setIsSigningIn] = useState(false)
  const [signInError, setSignInError] = useState(null)

  const [state, setState] = useState({ status: 'loading', preview: null, error: null })
  const [isAccepting, setIsAccepting] = useState(false)

  const loadPreview = useCallback(async () => {
    setState({ status: 'loading', preview: null, error: null })
    try {
      const preview = await previewInvitation(token)
      setState({ status: 'ready', preview, error: null })
    } catch (error) {
      setState({ status: 'error', preview: null, error: error.message })
    }
  }, [token])

  useEffect(() => {
    if (isAuthenticated && token) {
      loadPreview()
    }
  }, [isAuthenticated, token, loadPreview])

  async function handleSignIn() {
    setSignInError(null)
    setIsSigningIn(true)
    try {
      await signInWithGoogle()
    } catch (error) {
      if (error.code !== 'auth/popup-closed-by-user' && error.code !== 'auth/cancelled-popup-request') {
        setSignInError(error.message || 'Sign-in failed. Please try again.')
      }
    } finally {
      setIsSigningIn(false)
    }
  }

  async function handleAccept() {
    setIsAccepting(true)
    try {
      await acceptInvitation(token)
      await refreshUser()
      navigate(ROUTES.DASHBOARD, { replace: true })
    } catch (error) {
      setState((prev) => ({ ...prev, status: 'error', error: error.message }))
    } finally {
      setIsAccepting(false)
    }
  }

  if (!token) {
    return (
      <CenteredCard>
        <div className="mt-5 flex items-start gap-2 rounded-lg border border-red-200 bg-red-500/10 px-3 py-2.5 text-left text-sm text-red-700 dark:border-red-900/40 dark:text-red-300">
          <AlertCircle size={16} className="mt-0.5 shrink-0" />
          <span>
            This invitation link is missing its token. Ask your platform administrator to share the invitation link
            or token again.
          </span>
        </div>
      </CenteredCard>
    )
  }

  if (loading) {
    return (
      <CenteredCard>
        <div className="mt-8 space-y-3">
          <Skeleton className="h-4 w-3/4 mx-auto" />
          <Skeleton className="h-10 w-full" />
        </div>
      </CenteredCard>
    )
  }

  if (!isAuthenticated) {
    return (
      <CenteredCard>
        <h1 className="mt-8 text-lg font-semibold text-neutral-900 dark:text-neutral-100">You've been invited to GainBox</h1>
        <p className="mt-1.5 text-sm text-neutral-500">Sign in with Google to view and accept your invitation.</p>

        {signInError && (
          <div className="mt-5 flex items-start gap-2 rounded-lg border border-red-200 bg-red-500/10 px-3 py-2.5 text-left text-sm text-red-700 dark:border-red-900/40 dark:text-red-300">
            <AlertCircle size={16} className="mt-0.5 shrink-0" />
            <span>{signInError}</span>
          </div>
        )}

        <Button type="button" variant="secondary" size="lg" className="mt-6 w-full" onClick={handleSignIn} disabled={isSigningIn}>
          {isSigningIn ? 'Signing in…' : 'Sign in with Google'}
        </Button>
      </CenteredCard>
    )
  }

  if (state.status === 'loading') {
    return (
      <CenteredCard>
        <div className="mt-8 space-y-3">
          <Skeleton className="h-4 w-3/4 mx-auto" />
          <Skeleton className="h-4 w-1/2 mx-auto" />
          <Skeleton className="h-10 w-full" />
        </div>
      </CenteredCard>
    )
  }

  if (state.status === 'error') {
    const isWrongAccount = state.error?.includes('different email address')

    return (
      <CenteredCard>
        <h1 className="mt-8 text-lg font-semibold text-neutral-900 dark:text-neutral-100">We couldn't open this invitation</h1>
        <div className="mt-5 flex items-start gap-2 rounded-lg border border-red-200 bg-red-500/10 px-3 py-2.5 text-left text-sm text-red-700 dark:border-red-900/40 dark:text-red-300">
          <AlertCircle size={16} className="mt-0.5 shrink-0" />
          <span>{state.error}</span>
        </div>
        {isWrongAccount && (
          <Button type="button" variant="secondary" className="mt-6 w-full" onClick={signOut}>
            Sign in with a different account
          </Button>
        )}
      </CenteredCard>
    )
  }

  const { preview } = state

  return (
    <CenteredCard>
      <h1 className="mt-8 text-lg font-semibold text-neutral-900 dark:text-neutral-100">You're invited to join {preview.businessName}</h1>
      <p className="mt-1.5 text-sm text-neutral-500">Confirm the details below, then accept to continue.</p>

      <dl className="mt-6 space-y-3 rounded-lg border border-neutral-200 bg-neutral-50 px-4 py-3 text-left text-sm dark:border-neutral-800 dark:bg-neutral-950">
        <div className="flex items-center justify-between">
          <dt className="text-neutral-500">Merchant</dt>
          <dd className="text-neutral-800 dark:text-neutral-200">{preview.businessName}</dd>
        </div>
        <div className="flex items-center justify-between">
          <dt className="text-neutral-500">Invited email</dt>
          <dd className="text-neutral-800 dark:text-neutral-200">{preview.email}</dd>
        </div>
        <div className="flex items-center justify-between">
          <dt className="text-neutral-500">Role</dt>
          <dd className="text-neutral-800 dark:text-neutral-200">{preview.role}</dd>
        </div>
        <div className="flex items-center justify-between">
          <dt className="text-neutral-500">Status</dt>
          <dd>
            <Badge tone={STATUS_TONE[preview.status] ?? 'neutral'}>{preview.status}</Badge>
          </dd>
        </div>
      </dl>

      <Button type="button" size="lg" className="mt-6 w-full" onClick={handleAccept} disabled={isAccepting}>
        {isAccepting ? 'Accepting…' : 'Accept Invitation'}
      </Button>
    </CenteredCard>
  )
}
