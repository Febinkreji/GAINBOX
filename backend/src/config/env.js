import 'dotenv/config'
import { z } from 'zod'

/**
 * Every environment variable the app depends on is validated once, here, at
 * boot. Nothing else in the codebase should read `process.env` directly —
 * import `env` instead, so a missing/malformed var fails fast at startup
 * rather than surfacing as a confusing error mid-request.
 */
const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  API_VERSION: z.string().default('v1'),

  CORS_ORIGIN: z.string().default('http://localhost:5173'),

  DATABASE_URL: z.string().optional(),
  DATABASE_POOL_MAX: z.coerce.number().int().positive().default(10),

  FIREBASE_PROJECT_ID: z.string().optional(),
  FIREBASE_CLIENT_EMAIL: z.string().optional(),
  FIREBASE_PRIVATE_KEY: z.string().optional(),

  // All optional, same reasoning as the Firebase block above: the server
  // boots without them, and the Surfboard module only fails — with a clear
  // error, not a misleading one — the moment something actually tries to
  // use it (see config/surfboard.config.js's assertSurfboardConfigured()).
  // Confirmed against the real Developer Portal (Sprint 2B-1): a static
  // API-KEY/API-SECRET header pair plus an account-level partner id — not
  // an OAuth client-credentials exchange, which was Sprint 1's unconfirmed
  // placeholder. There is no API version segment in any confirmed URL, so
  // SURFBOARD_API_VERSION (Sprint 1's other unconfirmed assumption) has
  // been removed rather than kept around wrong.
  SURFBOARD_BASE_URL: z.string().optional(),
  SURFBOARD_PARTNER_ID: z.string().optional(),
  SURFBOARD_API_KEY: z.string().optional(),
  SURFBOARD_API_SECRET: z.string().optional(),
  SURFBOARD_REQUEST_TIMEOUT_MS: z.coerce.number().int().positive().default(10000),
  // Merchant Integration Framework (Sprint 2A) — how often the outbox
  // worker polls for queued syncs. Independent of whether Surfboard itself
  // is configured; the worker runs regardless (see merchantSyncOutbox.worker.js).
  SURFBOARD_SYNC_POLL_INTERVAL_MS: z.coerce.number().int().positive().default(15000),
  // Account-level billing plan id for Merchant Creation's
  // controlFields.transactionPricingPlan (confirmed via the official
  // Surfboard Create Merchant docs — required whenever the partner account
  // has more than one billing plan configured). Not per-merchant data, same
  // reasoning as SURFBOARD_PARTNER_ID — belongs in config, not threaded
  // through the merchant model.
  SURFBOARD_TRANSACTION_PRICING_PLAN: z.string().optional(),
  // HMAC-SHA512 secret Surfboard signs webhook deliveries with (see
  // modules/webhooks/surfboardWebhookSignature.js). Registered manually in
  // the Surfboard Console — optional here for the same reason as the
  // credentials above: the webhook route only fails, with a clear 401, the
  // moment a delivery actually arrives unverifiable.
  SURFBOARD_WEBHOOK_SECRET: z.string().optional(),

  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),

  // Development Bootstrap (see src/bootstrap/platformAdminBootstrap.js) —
  // never affects behavior unless explicitly turned on. `z.coerce.boolean()`
  // is deliberately NOT used here: it coerces any non-empty string
  // (including the literal text "false") to `true`, which would silently
  // enable bootstrap in any environment that merely sets the var to
  // anything at all — only the literal string "true" should turn it on.
  BOOTSTRAP_ENABLED: z
    .string()
    .optional()
    .transform((value) => value === 'true'),
  BOOTSTRAP_PLATFORM_ADMIN_EMAIL: z.string().trim().toLowerCase().email().optional(),
})

const parsed = envSchema.safeParse(process.env)

if (!parsed.success) {
  console.error('Invalid environment configuration:', parsed.error.flatten().fieldErrors)
  process.exit(1)
}

export const env = parsed.data
export const isProduction = env.NODE_ENV === 'production'
export const isDevelopment = env.NODE_ENV === 'development'
