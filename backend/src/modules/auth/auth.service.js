import { notImplemented } from '../../utils/notImplemented.js'

/**
 * Auth is a process, not a persisted aggregate — it has no repository of
 * its own. `getCurrentUser` was removed from here: with the identity
 * provider now real, "who am I" is simply `req.user` as populated by
 * requireAuth() — no database lookup needed for that. A future
 * "expand req.user into a full GainBox user profile" feature belongs in
 * the User module (still a stub) once it has a real repository, not here.
 */
export const authService = {
  async createSession(_token) {
    notImplemented('AuthService.createSession')
  },
}
