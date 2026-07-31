/**
 * Reusable retry policy for outbound Surfboard calls — isolated on purpose
 * (Step 4 of the Surfboard Integration Framework) so every future adapter
 * (Merchant, Store, Device, Payment) shares one definition of "transient"
 * instead of each reimplementing its own backoff loop.
 *
 * Retries only failures that are plausibly transient: a timeout, a reset
 * connection, or an HTTP status Surfboard itself would expect a client to
 * retry (429 rate limit, 5xx). Never retries anything that means "the
 * request itself was wrong" or "you're not allowed" — retrying those would
 * just repeat the same failure while burning attempts and time.
 */

const RETRYABLE_STATUS_CODES = new Set([429, 500, 502, 503, 504])
const RETRYABLE_ERROR_CODES = new Set(['ECONNRESET', 'ETIMEDOUT', 'ECONNREFUSED', 'EAI_AGAIN', 'ENOTFOUND'])

/**
 * @param {Error & { statusCode?: number, code?: string, name?: string }} error
 */
export function isTransientSurfboardError(error) {
  if (!error) return false

  // fetch's AbortController-driven timeout throws a DOMException named
  // 'AbortError' — see surfboard.client.js's request(). Treated the same
  // as a network-level timeout.
  if (error.name === 'AbortError') return true

  if (error.code && RETRYABLE_ERROR_CODES.has(error.code)) return true

  if (typeof error.statusCode === 'number' && RETRYABLE_STATUS_CODES.has(error.statusCode)) return true

  return false
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * @param {(attempt: number) => Promise<any>} fn - `attempt` is 1-indexed.
 * @param {object} [options]
 * @param {number} [options.maxAttempts] - Total attempts including the first, not extra retries.
 * @param {number} [options.baseDelayMs] - Delay before the 2nd attempt; doubles each attempt after (exponential backoff).
 * @param {(info: { attempt: number, delayMs: number, error: Error }) => void} [options.onRetry]
 */
export async function withRetry(fn, { maxAttempts = 3, baseDelayMs = 200, onRetry } = {}) {
  let attempt = 0

  for (;;) {
    attempt += 1

    try {
      return await fn(attempt)
    } catch (error) {
      const hasAttemptsLeft = attempt < maxAttempts
      if (!hasAttemptsLeft || !isTransientSurfboardError(error)) {
        throw error
      }

      const delayMs = baseDelayMs * 2 ** (attempt - 1)
      onRetry?.({ attempt, delayMs, error })
      await sleep(delayMs)
    }
  }
}
