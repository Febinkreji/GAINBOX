import { notImplemented } from '../../utils/notImplemented.js'

/**
 * Port (interface) for whatever identity provider backs authentication.
 * Firebase Authentication is the intended implementation, but nothing in
 * this codebase should import the Firebase Admin SDK directly — a future
 * `firebaseIdentityAdapter.js` will implement this same function signature,
 * and only src/config/firebase.config.js + that adapter will ever know
 * Firebase is involved.
 *
 * @param {string} token - Raw bearer token from the Authorization header.
 * @returns {Promise<{ id: string, email?: string }>}
 */
export async function verifyIdToken(_token) {
  notImplemented('IdentityProvider.verifyIdToken')
}
