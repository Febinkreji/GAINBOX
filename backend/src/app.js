import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import swaggerUi from 'swagger-ui-express'
import { env } from './config/env.js'
import { requestLogger } from './middlewares/requestLogger.middleware.js'
import { notFound } from './middlewares/notFound.middleware.js'
import { errorHandler } from './middlewares/errorHandler.middleware.js'
import apiRoutes from './routes/index.js'
import webhookRoutes from './modules/webhooks/webhook.routes.js'
import { swaggerSpec } from './docs/swagger.js'

/**
 * Express app assembly — no listening/port logic here, so the app can be
 * imported directly by tests later without binding a socket. That lives in
 * server.js.
 */
export function createApp() {
  const app = express()

  app.use(helmet())
  app.use(cors({ origin: env.CORS_ORIGIN.split(',').map((origin) => origin.trim()) }))
  // `verify` stashes the exact raw bytes on `req.rawBody` before JSON-parsing
  // mutates anything — needed only by the Surfboard webhook's HMAC-SHA512
  // signature check (see modules/webhooks/surfboardWebhookSignature.js),
  // since re-serializing the parsed body could produce different bytes than
  // what Surfboard actually signed. Harmless for every other route: it's an
  // extra unused property on `req`, not a behavior change.
  app.use(express.json({ verify: (req, _res, buf) => { req.rawBody = buf } }))
  app.use(requestLogger)

  // Unversioned health check for load balancers / uptime monitors.
  app.get('/health', (_req, res) => res.status(200).json({ status: 'ok' }))

  // Unversioned, same reasoning as /health: an external provider's webhook
  // URL shouldn't move when the internal API version changes.
  app.use('/webhooks', webhookRoutes)

  // Swagger UI's bootstrap script is inline, which helmet's default CSP
  // (script-src 'self') blocks. Rather than relax the CSP globally, drop
  // the header only for this path — every other route keeps the full
  // strict policy from the helmet() call above.
  app.use(
    '/docs',
    (_req, res, next) => {
      res.removeHeader('Content-Security-Policy')
      next()
    },
    swaggerUi.serve,
    swaggerUi.setup(swaggerSpec),
  )

  app.use(`/api/${env.API_VERSION}`, apiRoutes)

  app.use(notFound)
  app.use(errorHandler)

  return app
}
