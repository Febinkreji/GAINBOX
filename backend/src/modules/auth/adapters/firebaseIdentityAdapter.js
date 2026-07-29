import { initializeApp, cert } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
import { firebaseConfig } from '../../../config/firebase.config.js'
import { UnauthorizedError } from '../../../errors/index.js'
import { logger } from '../../../logger/logger.js'

/**
 * Firebase's implementation of IdentityProviderPort (see
 * ../identityProvider.port.js). This is the only file in the codebase that
 * imports `firebase-admin` — everything else depends on the port, wired in
 * via ../identityProvider.providers.js.
 */

let app

/**
 * Lazily initializes the Firebase Admin app on first use — mirrors
 * database/connection.js's getPool() pattern: the server can boot without
 * Firebase credentials configured, and only fails the moment authentication
 * is actually attempted, not at startup. Missing/malformed credentials are
 * a deployment misconfiguration (our fault), so this throws a plain Error,
 * not an AppError — it should surface as 500, not 401, since a client's
 * token isn't the problem.
 */
function isConfigured() {
  return Boolean(firebaseConfig.projectId && firebaseConfig.clientEmail && firebaseConfig.privateKey)
}

function getFirebaseAuth() {
  if (!isConfigured()) {
    throw new Error(
      'Firebase Admin credentials are not configured — set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, and FIREBASE_PRIVATE_KEY.',
    )
  }

  if (!app) {
    app = initializeApp({
      credential: cert({
        projectId: firebaseConfig.projectId,
        clientEmail: firebaseConfig.clientEmail,
        // .env files can't hold real newlines, so a private key pasted
        // there typically arrives with literal "\n" sequences — convert
        // them back to real newlines before handing the PEM to the SDK.
        privateKey: firebaseConfig.privateKey.replace(/\\n/g, '\n'),
      }),
    })
  }

  return getAuth(app)
}

export const firebaseIdentityAdapter = {
  async verifyIdToken(token) {
    const auth = getFirebaseAuth()

    try {
      const decodedToken = await auth.verifyIdToken(token)

      return {
        id: decodedToken.uid,
        email: decodedToken.email ?? null,
        emailVerified: decodedToken.email_verified ?? false,
        name: decodedToken.name ?? null,
      }
    } catch (error) {
      // Any verification failure (expired, revoked, malformed, wrong
      // project, ...) is the client's problem, not ours — normalize every
      // case to one operational 401, rather than leaking Firebase's
      // internal error shape to the caller. Still logged here (not just
      // thrown) since the normalized 401 alone won't tell us *why*.
      logger.warn({ err: error }, 'Firebase token verification failed')
      throw new UnauthorizedError('Invalid or expired authentication token')
    }
  },

  /**
   * Health-check only (see modules/platform/platform.health.service.js) —
   * proves Firebase Admin can actually reach Firebase's servers, not just
   * that credentials are present, via one cheap, harmless admin call
   * (list at most 1 user). Never used by the authentication path itself,
   * and never throws — a failed check is health information, not an error.
   */
  async checkConnectivity() {
    if (!isConfigured()) {
      return { status: 'not_configured' }
    }

    try {
      const auth = getFirebaseAuth()
      await auth.listUsers(1)
      return { status: 'ok' }
    } catch (error) {
      logger.warn({ err: error }, 'Firebase connectivity check failed')
      return { status: 'error', message: error.message }
    }
  },
}
