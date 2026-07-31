import axios from 'axios'
import { signOut } from 'firebase/auth'
import { auth } from '@/services/firebase'

/**
 * Shared HTTP client for the GainBox backend only.
 *
 * The frontend never talks to Surfboard directly — per the GainBox system
 * architecture, all Surfboard communication (merchant creation, payments,
 * device management, etc.) is proxied through the GainBox backend, which is
 * the only party holding Surfboard credentials. Every `services/*Service.js`
 * module should call GainBox backend routes through this client; none of
 * them should ever point at a Surfboard host directly.
 */

// 👇 TEMPORARY DEBUG LOG
console.log('VITE_API_BASE_URL =', import.meta.env.VITE_API_BASE_URL)

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? '/api',
  headers: {
    'Content-Type': 'application/json',
  },
})

// Every backend route (aside from /health and Firebase-verification-only
// endpoints) requires "Authorization: Bearer <Firebase ID token>" — see
// backend/src/middlewares/auth.middleware.js. Attaching it here means no
// individual service function ever has to think about auth.
apiClient.interceptors.request.use(async (config) => {
  const user = auth.currentUser

  if (user) {
    const token = await user.getIdToken()
    config.headers.Authorization = `Bearer ${token}`
  }

  return config
})

/**
 * Every backend response is the same envelope: { success, message, data,
 * meta }. Failures normalize to a plain Error whose message is the
 * backend's own message (e.g. "Merchant not found") when present, so call
 * sites and toasts never have to reach into error.response.data themselves.
 *
 * A 401 mid-session (a token the backend no longer accepts — a disabled
 * account, a revoked session) triggers a real sign-out rather than a bare
 * toast: firebase's signOut() flips AuthProvider's `user` to null, which
 * ProtectedRoute already redirects to /login for — no separate "force
 * logout" plumbing needed beyond that.
 */
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const backendMessage = error.response?.data?.message
    const normalized = new Error(
      backendMessage || error.message || 'Something went wrong',
    )
    normalized.status = error.response?.status
    normalized.details = error.response?.data?.details

    if (normalized.status === 401 && auth.currentUser) {
      signOut(auth)
    }

    return Promise.reject(normalized)
  },
)