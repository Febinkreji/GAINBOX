/**
 * OpenAPI documentation for the Webhook module. Lives here rather than
 * inline in webhook.routes.js because webhook infrastructure is protected
 * from modification — see docs/paths/merchant.docs.js for the same
 * reasoning.
 */

/**
 * @openapi
 * /webhooks/surfboard:
 *   post:
 *     summary: Receive a Surfboard webhook
 *     description: >
 *       Foundation only: validates that the body is a JSON object, logs
 *       receipt, and returns 202. Does not verify the request actually came
 *       from Surfboard (signature verification is not implemented yet) and
 *       does not process the payload or call any business service.
 *     tags: [Webhooks]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             additionalProperties: true
 *             example: { event: 'payment.settled', data: {} }
 *     responses:
 *       202:
 *         description: Webhook receipt logged
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ApiResponse' }
 *       422:
 *         description: Body was not a JSON object
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ValidationError' }
 */

export {}
