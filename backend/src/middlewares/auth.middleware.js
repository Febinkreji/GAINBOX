import { UnauthorizedError } from '../errors/index.js'
import { identityProvider } from '../modules/auth/identityProvider.providers.js'
import { identitySyncService } from '../modules/identity/identitySync.service.js'

/**
 * Extracts a bearer token, verifies it via the IdentityProvider port (today:
 * Firebase Admin — see modules/auth/identityProvider.providers.js), then
 * reconciles it against Postgres via Identity Sync (see
 * modules/identity/identitySync.service.js) so req.user carries the internal
 * UUID business modules key off, never a provider's external id directly.
 * This file doesn't know or care which provider backs verification, and
 * never imports firebase-admin or touches SQL itself — both are pushed
 * behind their own service.
 *
 * Authentication only verifies identity, and Identity Sync only ensures a
 * record for it exists and is current. Neither decides what req.user is
 * allowed to do — no role, permission, or req.user.status check happens
 * here, or anywhere downstream in the business modules. That's
 * Authorization's job, and Authorization does not exist yet (a future
 * requireRole()/requirePermission() middleware would sit after this one).
 */
export function requireAuth() {
  return async function requireAuthMiddleware(req, _res, next) {
    try {
      const header = req.headers.authorization ?? ''
      const [scheme, token] = header.split(' ')

      if (scheme !== 'Bearer' || !token) {
        throw new UnauthorizedError('Missing or malformed Authorization header')
      }

      const identity = await identityProvider.verifyIdToken(token)
      req.user = await identitySyncService.sync(identity)
      next()
    } catch (error) {
      next(error)
    }
  }
}
