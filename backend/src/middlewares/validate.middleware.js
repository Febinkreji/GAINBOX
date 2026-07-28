import { ValidationError } from '../errors/index.js'

/**
 * Generic Zod-schema runner. Usage: `validate(createMerchantSchema, 'body')`
 * in a route's middleware chain, before the controller. Replaces
 * `req[source]` with the parsed (and therefore type-coerced) value on
 * success, so controllers always read already-validated data.
 */
export function validate(schema, source = 'body') {
  return function validateMiddleware(req, _res, next) {
    const result = schema.safeParse(req[source])

    if (!result.success) {
      return next(new ValidationError('Invalid request data', result.error.flatten().fieldErrors))
    }

    req[source] = result.data
    return next()
  }
}
