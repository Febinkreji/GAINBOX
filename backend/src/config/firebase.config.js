import { env } from './env.js'

/**
 * Credential shape only. The `firebase-admin` SDK is deliberately not a
 * dependency yet — nothing calls `admin.initializeApp()` with this. It
 * exists so the future identity provider adapter (see
 * src/modules/auth/identityProvider.port.js) has one place to read from.
 */
export const firebaseConfig = {
  projectId: env.FIREBASE_PROJECT_ID,
  clientEmail: env.FIREBASE_CLIENT_EMAIL,
  privateKey: env.FIREBASE_PRIVATE_KEY,
}
