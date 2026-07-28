/**
 * Placeholder for a service call that will be wired up once the corresponding
 * GainBox backend endpoint (and, behind it, the Surfboard API) exists.
 *
 * Every Surfboard-facing service function in `services/` should return this
 * instead of performing a real request, so the call sites (pages/hooks) can
 * already be written against the final function signature without needing a
 * rewrite once the backend lands.
 *
 * @param {string} capability - Human-readable Surfboard capability name, e.g. "Merchant Creation".
 * @param {unknown} [context] - The arguments the caller passed in, logged in dev to help trace call sites.
 * @returns {Promise<never>}
 */
export function notImplemented(capability, context) {
  if (import.meta.env.DEV && context !== undefined) {
    console.info(`[Surfboard → ${capability}] called with`, context)
  }
  return Promise.reject(
    new Error(`${capability} is not implemented yet — pending Surfboard API integration.`),
  )
}
