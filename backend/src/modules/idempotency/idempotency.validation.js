import { z } from 'zod'

// A client-supplied header value — bounded length, otherwise unconstrained.
export const idempotencyKeySchema = z.string().trim().min(1).max(255)
