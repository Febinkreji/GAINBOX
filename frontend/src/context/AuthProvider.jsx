import { useCallback, useEffect, useState } from 'react'
import { onAuthStateChanged, signInWithPopup, signOut as firebaseSignOut } from 'firebase/auth'
import { auth, googleProvider } from '@/services/firebase'
import { apiClient } from '@/services/apiClient'
import { AuthContext } from '@/context/AuthContext'

/**
 * Bridges Firebase Authentication to the backend's Identity Sync/
 * Authorization pipeline — mirrors backend/src/middlewares/auth.middleware.js's
 * own flow client-side: a Firebase sign-in alone isn't "logged in" for this
 * app; `user` (from GET /auth/me) is the Postgres identity Identity Sync
 * reconciled, including merchantAssignments/roles, which is what the rest
 * of the app actually needs (see ProtectedRoute, Sidebar's nav filtering).
 */
export function AuthProvider({ children }) {
  const [firebaseUser, setFirebaseUser] = useState(null)
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchUser = useCallback(async () => {
    try {
      const response = await apiClient.get('/auth/me')
      setUser(response.data.data)
    } catch (fetchError) {
      // A Firebase sign-in that Authorization rejects (e.g. a disabled
      // account) — keep firebaseUser set but leave `user` null, so
      // ProtectedRoute treats this as "not authenticated" rather than
      // crashing on a missing profile.
      setError(fetchError)
      setUser(null)
    }
  }, [])

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (nextFirebaseUser) => {
      setFirebaseUser(nextFirebaseUser)
      setError(null)

      if (!nextFirebaseUser) {
        setUser(null)
        setLoading(false)
        return
      }

      await fetchUser()
      setLoading(false)
    })

    return unsubscribe
  }, [fetchUser])

  // Re-fetches GET /auth/me without a full page reload — used after
  // redeeming a Merchant Owner invitation token (see ProtectedRoute.jsx),
  // so merchantAssignments/roles pick up the new assignment immediately and
  // the guard naturally re-renders past the "no merchant access" blocker.
  const refreshUser = useCallback(async () => {
    await fetchUser()
  }, [fetchUser])

  const signInWithGoogle = useCallback(async () => {
    setError(null)
    await signInWithPopup(auth, googleProvider)
    // onAuthStateChanged above fires from this and fetches /auth/me.
  }, [])

  const signOut = useCallback(async () => {
    await firebaseSignOut(auth)
    // onAuthStateChanged (above) also fires from this and clears
    // firebaseUser/user on its own, but that's async — clearing here too
    // means no stale merchant/role state is visible for even one render
    // between "Sign Out clicked" and the listener catching up.
    setUser(null)
    setError(null)
  }, [])

  // This app is the Merchant Portal — "the merchant" is the first active
  // assignment. A user staffed at more than one merchant is a future
  // multi-merchant-switcher concern, out of scope here.
  const merchant = user?.merchantAssignments?.[0] ?? null

  const value = {
    firebaseUser,
    user,
    merchant,
    roles: user?.roles ?? [],
    isAuthenticated: Boolean(user),
    loading,
    error,
    signInWithGoogle,
    signOut,
    refreshUser,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
