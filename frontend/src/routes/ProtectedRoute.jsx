import { useState } from 'react'
import { Navigate, Outlet, useNavigate } from 'react-router-dom'
import { LogOut } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { useToast } from '@/hooks/useToast'
import { ROUTES } from '@/constants/routes'
import Logo from '@/components/ui/Logo'
import { APP_NAME } from '@/constants/app'
import FormField from '@/components/forms/FormField'
import Input from '@/components/forms/Input'
import Button from '@/components/ui/Button'
import { acceptInvitation } from '@/services/authService'

function FullScreenLoader() {
  return (
    <div className="flex h-svh items-center justify-center bg-white dark:bg-neutral-950">
      <Logo variant="mark" alt={APP_NAME} className="h-10 w-10 animate-pulse" />
    </div>
  )
}

/**
 * Self-serve invitation redemption for the "no merchant access yet"
 * blocker below — there's no email delivery, so the invitation token is
 * shared out-of-band by a platform admin (see Platform > Invitations) and
 * pasted in here. On success, refreshUser() re-fetches GET /auth/me so
 * ProtectedRoute re-evaluates with the new merchantAssignment and falls
 * through to the Outlet on its own — no explicit navigation needed.
 */
function AcceptInvitationForm() {
  const { refreshUser } = useAuth()
  const toast = useToast()
  const [token, setToken] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit(event) {
    event.preventDefault()
    if (!token.trim()) return

    setIsSubmitting(true)
    try {
      const result = await acceptInvitation(token.trim())
      toast.success(`You've joined ${result.businessName} as ${result.role}`)
      await refreshUser()
    } catch (error) {
      toast.error(error.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-3 text-left">
      <FormField label="Invitation Token" htmlFor="invitation-token">
        <Input
          id="invitation-token"
          value={token}
          onChange={(event) => setToken(event.target.value)}
          placeholder="Paste your invitation token, or open the invitation link you received"
        />
      </FormField>
      <Button type="submit" className="w-full" disabled={isSubmitting || !token.trim()}>
        {isSubmitting ? 'Verifying…' : 'Accept Invitation'}
      </Button>
    </form>
  )
}

/**
 * Session bootstrap gate — mirrors the backend's own pipeline (Firebase
 * Authentication -> Identity Sync -> Authorization) client-side:
 * `loading` covers both "Firebase hasn't resolved auth state yet" and
 * "GET /auth/me hasn't returned yet" (see AuthProvider). Unauthenticated
 * callers are redirected to /login; a platform-admin has no merchant
 * assignment by design (they operate across merchants, not within one) so
 * they bypass the merchant-assignment check entirely. Everyone else with no
 * assignment sees a clear message plus a way to redeem an invitation token.
 */
export default function ProtectedRoute() {
  const { loading, isAuthenticated, user, merchant, roles, signOut } = useAuth()
  const navigate = useNavigate()

  if (loading) {
    return <FullScreenLoader />
  }

  if (!isAuthenticated) {
    return <Navigate to={ROUTES.LOGIN} replace />
  }

  const isPlatformAdmin = roles.includes('platform-admin')

  async function handleSignOut() {
    await signOut()
    navigate(ROUTES.LOGIN, { replace: true })
  }

  if (!merchant && !isPlatformAdmin) {
    return (
      <div className="flex h-svh flex-col items-center justify-center gap-2 bg-white px-6 text-center dark:bg-neutral-950">
        <h1 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">No Merchant Access Yet</h1>

        <p className="mt-1 text-xs font-medium uppercase tracking-wide text-neutral-500">Signed in as</p>
        <p className="text-sm text-neutral-800 dark:text-neutral-200">{user?.email}</p>

        <p className="mt-3 max-w-sm text-sm text-neutral-500">Your account has not been assigned to a merchant yet.</p>
        <p className="max-w-sm text-sm text-neutral-500">
          If a Platform Administrator invited you, paste your invitation token below or open the invitation link you
          received.
        </p>

        <div className="mt-4 w-full max-w-sm">
          <AcceptInvitationForm />
        </div>

        <div className="mt-8 w-full max-w-sm border-t border-neutral-200 pt-5 dark:border-neutral-800">
          <p className="text-sm text-neutral-500">Need to use a different Google account?</p>
          <Button type="button" variant="secondary" className="mt-3 w-full" onClick={handleSignOut}>
            <LogOut size={15} />
            Sign Out
          </Button>
        </div>
      </div>
    )
  }

  return <Outlet />
}
