import { UnauthorizedError } from '../errors/index.js'
import { verifyIdToken } from '../modules/auth/identityProvider.port.js'

/**
 * Extracts a bearer token and resolves it to a user identity via the
 * IdentityProvider port (today: an unimplemented stub — see
 * modules/auth/identityProvider.port.js). Firebase Admin is intentionally
 * not wired up here; this middleware doesn't know or care which identity
 * provider backs it.
 */
export function requireAuth() {
  return async function requireAuthMiddleware(req, _res, next) {
    try {
      const header = req.headers.authorization ?? ''
      const [scheme, token] = header.split(' ')

      if (scheme !== 'Bearer' || !token) {
        throw new UnauthorizedError('Missing or malformed Authorization header')
      }

      req.user = await verifyIdToken(token)
      next()
    } catch (error) {
      next(error)
    }
  }
}
