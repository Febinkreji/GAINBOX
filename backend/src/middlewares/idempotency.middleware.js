import { createHash } from 'node:crypto'
import { asyncHandler } from '../utils/asyncHandler.js'
import { ValidationError } from '../errors/index.js'
import { idempotencyKeySchema } from '../modules/idempotency/idempotency.validation.js'
import { idempotencyService } from '../modules/idempotency/idempotency.service.js'

function hashRequest(req) {
  return createHash('sha256')
    .update(JSON.stringify({ method: req.method, path: req.originalUrl, body: req.body ?? {} }))
    .digest('hex')
}

/**
 * Infrastructure only — not attached to any route yet (see task scope).
 * Detects an `Idempotency-Key` header, validates it, and either:
 *  - finds no existing record: stores a pending one and calls next(), or
 *  - finds an existing record: defers to idempotencyService.replay, which
 *    throws NotImplementedError, since returning the original response is
 *    not built yet.
 *
 * A request with no Idempotency-Key header passes through untouched —
 * this middleware is opt-in per request, not a blanket requirement.
 */
export function idempotency() {
  return asyncHandler(async (req, _res, next) => {
    const header = req.headers['idempotency-key']

    if (header === undefined) {
      return next()
    }

    const parsed = idempotencyKeySchema.safeParse(header)
    if (!parsed.success) {
      throw new ValidationError('Invalid Idempotency-Key header', parsed.error.flatten().formErrors)
    }

    const idempotencyKey = parsed.data
    const existing = await idempotencyService.findByKey(idempotencyKey)

    if (existing) {
      await idempotencyService.replay(existing)
      return undefined
    }

    await idempotencyService.createPendingRecord(idempotencyKey, hashRequest(req))
    return next()
  })
}
