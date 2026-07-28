import { z } from 'zod'

// Surfboard's webhook payload shape isn't finalized and signature
// verification doesn't exist yet (see webhook.service.js) — this only
// confirms the body is a JSON object, without asserting a shape we'd have
// to guess at.
export const surfboardWebhookSchema = z.record(z.string(), z.unknown())
