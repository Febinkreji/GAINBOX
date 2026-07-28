import { notImplemented } from '../../utils/notImplemented.js'

/**
 * Auth is a process, not a persisted aggregate — it composes the
 * IdentityProvider port with the User domain (once a verified token is
 * resolved to a GainBox user record). It intentionally has no repository
 * of its own.
 */
export const authService = {
  async createSession(_token) {
    notImplemented('AuthService.createSession')
  },

  async getCurrentUser(_userId) {
    notImplemented('AuthService.getCurrentUser')
  },
}
