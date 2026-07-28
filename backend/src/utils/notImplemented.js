import { NotImplementedError } from '../errors/index.js'

/**
 * Shared stub for repository/service/adapter methods that don't have a real
 * implementation yet. Throwing (rather than resolving with fake data) means
 * a stub can never be mistaken for a working feature by whatever calls it.
 *
 * @param {string} feature - e.g. "MerchantRepository.create"
 * @returns {never}
 */
export function notImplemented(feature) {
  throw new NotImplementedError(feature)
}
