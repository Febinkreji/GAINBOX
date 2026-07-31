/**
 * OpenAPI documentation for the Merchant module.
 *
 * This file exists purely so swagger-jsdoc can pick up these comment
 * blocks — the merchant module itself is protected from modification, so
 * these annotations live here instead of inline above merchant.routes.js.
 * Every *new* module should prefer inline JSDoc in its own *.routes.js file
 * (see branch.routes.js) — this external-file pattern is specifically for
 * already-shipped modules that can't be touched.
 */

/**
 * @openapi
 * /merchants:
 *   get:
 *     summary: List merchants
 *     description: Supports search, filtering by status/businessType, sorting, and pagination.
 *     tags: [Merchants]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, minimum: 1, default: 1 }
 *       - in: query
 *         name: pageSize
 *         schema: { type: integer, minimum: 1, maximum: 100, default: 20 }
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *         description: Matches against business name and contact email.
 *       - in: query
 *         name: status
 *         schema: { type: string, enum: [pending, active, suspended] }
 *       - in: query
 *         name: businessType
 *         schema:
 *           type: string
 *           enum: [gym, meal-provider, wellness-center, yoga-studio, physio-clinic, nutrition-center, fitness-chain, other]
 *       - in: query
 *         name: sortBy
 *         schema: { type: string, enum: [businessName, createdAt, status] }
 *       - in: query
 *         name: sortOrder
 *         schema: { type: string, enum: [asc, desc] }
 *     responses:
 *       200:
 *         description: A page of merchants
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: array
 *                       items: { $ref: '#/components/schemas/Merchant' }
 *                     meta: { $ref: '#/components/schemas/Pagination' }
 *       401:
 *         description: Missing or invalid bearer token
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 *       422:
 *         description: Invalid query parameters
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ValidationError' }
 */

/**
 * @openapi
 * /merchants/{id}:
 *   get:
 *     summary: Get a merchant by id
 *     deprecated: true
 *     description: >
 *       **Deprecated** — use `GET /merchant/profile` instead, which derives
 *       the merchant from the authenticated user and needs no id. Kept for
 *       backward compatibility; not removed.
 *     tags: [Merchants]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: The merchant
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data: { $ref: '#/components/schemas/Merchant' }
 *       401:
 *         description: Missing or invalid bearer token
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 *       404:
 *         description: Merchant not found
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/NotFoundError' }
 */

/**
 * @openapi
 * /merchants:
 *   post:
 *     summary: Create a merchant
 *     description: >
 *       New merchants always start in "pending" status (a database default,
 *       not client-settable). After creation, GainBox calls the Surfboard
 *       merchant provider placeholder (merchantProvider.createMerchant),
 *       which currently throws NotImplementedError; that failure is logged,
 *       not surfaced to the caller — merchant creation still succeeds.
 *     tags: [Merchants]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [businessName, businessType]
 *             properties:
 *               businessName: { type: string, example: Iron Forge Fitness }
 *               businessType:
 *                 type: string
 *                 enum: [gym, meal-provider, wellness-center, yoga-studio, physio-clinic, nutrition-center, fitness-chain, other]
 *               contactEmail: { type: string, format: email }
 *               contactPhone: { type: string }
 *     responses:
 *       201:
 *         description: Merchant created
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data: { $ref: '#/components/schemas/Merchant' }
 *       401:
 *         description: Missing or invalid bearer token
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 *       422:
 *         description: Invalid request body
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ValidationError' }
 */

/**
 * @openapi
 * /merchants/{id}:
 *   patch:
 *     summary: Update a merchant
 *     deprecated: true
 *     description: >
 *       **Deprecated** — use `PATCH /merchant/profile` instead, which
 *       derives the merchant from the authenticated user and needs no id.
 *       Kept for backward compatibility; not removed.
 *     tags: [Merchants]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             minProperties: 1
 *             properties:
 *               businessName: { type: string }
 *               businessType:
 *                 type: string
 *                 enum: [gym, meal-provider, wellness-center, yoga-studio, physio-clinic, nutrition-center, fitness-chain, other]
 *               status: { type: string, enum: [pending, active, suspended] }
 *               contactEmail: { type: string, format: email }
 *               contactPhone: { type: string }
 *     responses:
 *       200:
 *         description: Merchant updated
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data: { $ref: '#/components/schemas/Merchant' }
 *       401:
 *         description: Missing or invalid bearer token
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 *       404:
 *         description: Merchant not found
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/NotFoundError' }
 *       422:
 *         description: Invalid request body
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ValidationError' }
 */

/**
 * @openapi
 * /merchants/{id}:
 *   delete:
 *     summary: Soft-delete a merchant
 *     description: Sets deleted_at; the row is never physically removed.
 *     tags: [Merchants]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Merchant deleted
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ApiResponse' }
 *       401:
 *         description: Missing or invalid bearer token
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 *       404:
 *         description: Merchant not found
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/NotFoundError' }
 */

export {}
