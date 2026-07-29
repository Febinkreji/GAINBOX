import { env } from './env.js'

/**
 * Credential shape only — no `firebase-admin` import here. This is the one
 * place that reads the raw env vars; the actual SDK call
 * (`admin.initializeApp()`) lives in
 * src/modules/auth/adapters/firebaseIdentityAdapter.js, the only file that
 * imports `firebase-admin` directly.
 */
export const firebaseConfig = {
  projectId: env.FIREBASE_PROJECT_ID,
  clientEmail: env.FIREBASE_CLIENT_EMAIL,
  privateKey: env.FIREBASE_PRIVATE_KEY,
}
