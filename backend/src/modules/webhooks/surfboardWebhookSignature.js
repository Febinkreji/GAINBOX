import { createHmac, timingSafeEqual } from 'node:crypto'
import { env } from '../../config/env.js'
import { UnauthorizedError } from '../../errors/index.js'

/**
 * Verifies the `x-webhook-signature` header on inbound Surfboard webhook
 * deliveries: HMAC-SHA512 over the exact raw request body, keyed by
 * SURFBOARD_WEBHOOK_SECRET (registered manually in the Surfboard Console —
 * confirmed fact, not GainBox-issued). Synchronous — a thrown error here
 * propagates through Express's normal error handling without needing
 * asyncHandler.
 *
 * Assumption flagged, not silently guessed at: the confirmed facts state
 * the algorithm (HMAC-SHA512) and header name, but not the signature's text
 * encoding. Hex digest is implemented here as the near-universal convention
 * for this kind of header (Stripe, GitHub, etc.) — revisit if Surfboard's
 * docs specify base64 instead.
 */
export function verifySurfboardWebhookSignature(req, _res, next) {
  const signature = req.headers['x-webhook-signature']

  if (!env.SURFBOARD_WEBHOOK_SECRET) {
    throw new UnauthorizedError('Surfboard webhook signature cannot be verified — SURFBOARD_WEBHOOK_SECRET is not configured')
  }

  if (!signature || !req.rawBody) {
    throw new UnauthorizedError('Missing Surfboard webhook signature')
  }

  const expected = createHmac('sha512', env.SURFBOARD_WEBHOOK_SECRET).update(req.rawBody).digest('hex')

  let signatureBuffer
  let expectedBuffer

  try {
    signatureBuffer = Buffer.from(signature, 'hex')
    expectedBuffer = Buffer.from(expected, 'hex')
  } catch {
    throw new UnauthorizedError('Malformed Surfboard webhook signature')
  }

  // timingSafeEqual throws on length mismatch rather than returning false —
  // checked explicitly first so a wrong-length signature is still a clean
  // 401, not a 500.
  if (signatureBuffer.length !== expectedBuffer.length || !timingSafeEqual(signatureBuffer, expectedBuffer)) {
    throw new UnauthorizedError('Invalid Surfboard webhook signature')
  }

  next()
}
