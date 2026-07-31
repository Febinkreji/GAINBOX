import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { AlertCircle } from 'lucide-react'
import Logo from '@/components/ui/Logo'
import Button from '@/components/ui/Button'
import { APP_TAGLINE } from '@/constants/app'
import { ROUTES } from '@/constants/routes'
import { useAuth } from '@/hooks/useAuth'
import { useTheme } from '@/hooks/useTheme'

export default function Login() {
  const { isAuthenticated, loading, merchant, roles, signInWithGoogle } = useAuth()
  const { resolvedTheme } = useTheme()
  const [isSigningIn, setIsSigningIn] = useState(false)
  const [error, setError] = useState(null)

  if (!loading && isAuthenticated) {
    // A platform-admin with no merchant assignment has nowhere to go on
    // the Merchant Portal's own Dashboard (it reads merchant.merchantId
    // directly) — send them to Platform Administration instead. Anyone
    // with a merchant assignment (including a hybrid admin+owner account)
    // still lands on the normal Dashboard.
    const isPurePlatformAdmin = !merchant && roles.includes('platform-admin')
    return <Navigate to={isPurePlatformAdmin ? ROUTES.PLATFORM_DASHBOARD : ROUTES.DASHBOARD} replace />
  }

  async function handleSignIn() {
    setError(null)
    setIsSigningIn(true)

    try {
      await signInWithGoogle()
    } catch (signInError) {
      // Popup closed by the user is the common, non-error case — don't
      // show a scary message for it.
      if (signInError.code !== 'auth/popup-closed-by-user' && signInError.code !== 'auth/cancelled-popup-request') {
        setError(signInError.message || 'Sign-in failed. Please try again.')
      }
    } finally {
      setIsSigningIn(false)
    }
  }

  return (
    <div className="flex h-svh items-center justify-center bg-white px-4 dark:bg-neutral-950">
      <div className="w-full max-w-sm rounded-2xl border border-neutral-200 bg-neutral-50 p-8 text-center shadow-xl dark:border-neutral-800 dark:bg-neutral-900/40">
        <Logo variant="lockup" theme={resolvedTheme} className="mx-auto h-8 w-auto" />
        <p className="mt-2 text-sm text-neutral-500">{APP_TAGLINE}</p>

        <h1 className="mt-8 text-lg font-semibold text-neutral-900 dark:text-neutral-100">Sign in to your account</h1>
        <p className="mt-1.5 text-sm text-neutral-500">Use your Google account to access the Merchant Portal.</p>

        {error && (
          <div className="mt-5 flex items-start gap-2 rounded-lg border border-red-200 bg-red-500/10 px-3 py-2.5 text-left text-sm text-red-700 dark:border-red-900/40 dark:text-red-300">
            <AlertCircle size={16} className="mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <Button
          type="button"
          variant="secondary"
          size="lg"
          className="mt-6 w-full"
          onClick={handleSignIn}
          disabled={isSigningIn}
        >
          <GoogleIcon />
          {isSigningIn ? 'Signing in…' : 'Sign in with Google'}
        </Button>
      </div>
    </div>
  )
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"
      />
      <path
        fill="#FBBC05"
        d="M3.964 10.706A5.41 5.41 0 0 1 3.68 9c0-.593.102-1.17.284-1.706V4.962H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.038l3.007-2.332z"
      />
      <path
        fill="#EA4335"
        d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.962L3.964 7.294C4.672 5.167 6.656 3.58 9 3.58z"
      />
    </svg>
  )
}
