import { Router } from 'express'
import { ApiResponse } from '../utils/ApiResponse.js'

const router = Router()

/**
 * @openapi
 * /health:
 *   get:
 *     summary: Versioned API health check
 *     description: Liveness/readiness probe for the versioned API. An unversioned /health also exists at the app root for load balancers.
 *     tags: [Health]
 *     security: []
 *     responses:
 *       200:
 *         description: Service is healthy
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ApiResponse' }
 *             example:
 *               success: true
 *               message: GainBox API is running
 *               data: { status: ok, timestamp: '2026-01-01T00:00:00.000Z' }
 */
router.get('/', (_req, res) => {
  ApiResponse.send(res, {
    data: { status: 'ok', timestamp: new Date().toISOString() },
    message: 'GainBox API is running',
  })
})

export default router
