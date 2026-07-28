import swaggerJsdoc from 'swagger-jsdoc'
import { env } from '../config/env.js'
import { components } from './schemas.js'

/**
 * swagger-jsdoc scans every file matching `apis` for `@openapi` JSDoc
 * comment blocks. Two kinds of files are scanned:
 *  - route files themselves (`modules/**\/*.routes.js`, `routes/*.routes.js`)
 *    — the pattern every *new* module should follow: annotate the route
 *    directly above its handler, and it appears here automatically, no
 *    changes to this file needed;
 *  - `docs/paths/*.docs.js` — comment-only files (no real route logic) for
 *    modules this task is not allowed to modify (merchant, webhooks), so
 *    their documentation lives next to this config instead of inside them.
 */
const swaggerDefinition = {
  openapi: '3.0.3',
  info: {
    title: 'GainBox API',
    version: '1.0.0',
    description:
      'Merchant Platform API for GainBox, built on top of Surfboard payment infrastructure. Endpoints under /api/{version} require a Bearer token unless noted otherwise; /health and /webhooks/* do not.',
  },
  servers: [{ url: `/api/${env.API_VERSION}`, description: 'Versioned API' }, { url: '/', description: 'App root (health, webhooks)' }],
  components,
  security: [{ bearerAuth: [] }],
}

export const swaggerSpec = swaggerJsdoc({
  definition: swaggerDefinition,
  apis: ['./src/modules/**/*.routes.js', './src/routes/*.routes.js', './src/docs/paths/*.docs.js'],
})
