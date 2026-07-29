import { Router } from 'express'
import { requireAuth } from '../../middlewares/auth.middleware.js'
import { requireRole } from '../../middlewares/authorization.middleware.js'
import { validate } from '../../middlewares/validate.middleware.js'
import { platformController } from './platform.controller.js'
import {
  merchantOverviewQuerySchema,
  merchantIdParamSchema,
  userOverviewQuerySchema,
  userIdParamSchema,
} from './platform.validation.js'
import { auditController } from '../audit/audit.controller.js'
import { listAuditQuerySchema, auditIdParamSchema } from '../audit/audit.validation.js'
import { incidentController } from '../incident/incident.controller.js'
import {
  createIncidentSchema,
  updateIncidentSchema,
  incidentIdParamSchema,
  listIncidentsQuerySchema,
} from '../incident/incident.validation.js'
import { runbookController } from '../runbook/runbook.controller.js'
import {
  createRunbookSchema,
  updateRunbookSchema,
  runbookIdParamSchema,
  listRunbooksQuerySchema,
} from '../runbook/runbook.validation.js'
import { recommendationController } from '../recommendation/recommendation.controller.js'
import {
  createRecommendationSchema,
  updateRecommendationSchema,
  recommendationIdParamSchema,
  listRecommendationsQuerySchema,
} from '../recommendation/recommendation.validation.js'

const router = Router()

// Platform Control Center: every route requires the platform-admin role via
// the existing Authorization middleware — no bespoke gate, no bypass.
// Merchant Owner/Staff/Viewer get the same 403 any other role-gated route
// in this codebase produces (see requireRole in authorization.middleware.js).
// Dashboard/Merchant/User/Audit/Health routes are read-only; Incident/
// Runbook/Recommendation routes below are the only writes in this module,
// and each still goes through the same requireAuth()+requireRole() gate —
// there is no separate, weaker path into them.
router.use(requireAuth(), requireRole('platform-admin'))

/**
 * @openapi
 * /platform/dashboard:
 *   get:
 *     summary: Platform-wide summary statistics
 *     description: >
 *       Every field is one aggregated SQL count computed in a single query
 *       — not a per-row scan. platform-admin only.
 *     tags: [Platform]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Platform summary
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data: { $ref: '#/components/schemas/PlatformDashboardSummary' }
 *       401:
 *         description: Missing or invalid bearer token
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 *       403:
 *         description: Caller is not a platform-admin
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 */
router.get('/dashboard', platformController.getDashboard)

/**
 * @openapi
 * /platform/merchants:
 *   get:
 *     summary: Paginated merchant overview
 *     description: >
 *       Per-merchant branch/device/staff/membership-plan counts, computed
 *       via correlated SQL subqueries (no in-memory aggregation).
 *       platform-admin only — unlike /merchants (business API), this is
 *       never scoped to "merchants I belong to".
 *     tags: [Platform]
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
 *         description: Matches against the merchant's business name.
 *       - in: query
 *         name: status
 *         schema: { type: string, enum: [pending, active, suspended] }
 *       - in: query
 *         name: sortBy
 *         schema: { type: string, enum: [businessName, createdAt, status] }
 *       - in: query
 *         name: sortOrder
 *         schema: { type: string, enum: [asc, desc] }
 *     responses:
 *       200:
 *         description: A page of merchant overview entries
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: array
 *                       items: { $ref: '#/components/schemas/PlatformMerchantOverviewItem' }
 *                     meta: { $ref: '#/components/schemas/Pagination' }
 *       401:
 *         description: Missing or invalid bearer token
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 *       403:
 *         description: Caller is not a platform-admin
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 *       422:
 *         description: Invalid query parameters
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ValidationError' }
 */
router.get(
  '/merchants',
  validate(merchantOverviewQuerySchema, 'query'),
  platformController.listMerchantOverview,
)

/**
 * @openapi
 * /platform/merchants/{merchantId}:
 *   get:
 *     summary: Full detail view of one merchant
 *     description: >
 *       Merchant plus every branch, device, membership plan, and staff
 *       assignment (including historical/removed staff) — read only,
 *       platform-admin only.
 *     tags: [Platform]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: merchantId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Full merchant detail
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data: { $ref: '#/components/schemas/PlatformMerchantDetails' }
 *       401:
 *         description: Missing or invalid bearer token
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 *       403:
 *         description: Caller is not a platform-admin
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 *       404:
 *         description: Merchant not found
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/NotFoundError' }
 */
router.get(
  '/merchants/:merchantId',
  validate(merchantIdParamSchema, 'params'),
  platformController.getMerchantDetails,
)

/**
 * @openapi
 * /platform/users:
 *   get:
 *     summary: Paginated user overview
 *     description: >
 *       Every user's assigned role names (global + merchant-scoped, merged)
 *       and distinct merchant count, computed via aggregate SQL. platform-
 *       admin only.
 *     tags: [Platform]
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
 *         description: Matches against display name or email.
 *       - in: query
 *         name: status
 *         schema: { type: string, enum: [active, invited, disabled] }
 *       - in: query
 *         name: role
 *         schema: { type: string, enum: [platform-admin, merchant-owner, merchant-staff, viewer, customer] }
 *         description: Restricts to users holding this role, globally or at any merchant.
 *       - in: query
 *         name: sortBy
 *         schema: { type: string, enum: [displayName, email, createdAt, status] }
 *       - in: query
 *         name: sortOrder
 *         schema: { type: string, enum: [asc, desc] }
 *     responses:
 *       200:
 *         description: A page of user overview entries
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: array
 *                       items: { $ref: '#/components/schemas/PlatformUserOverviewItem' }
 *                     meta: { $ref: '#/components/schemas/Pagination' }
 *       401:
 *         description: Missing or invalid bearer token
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 *       403:
 *         description: Caller is not a platform-admin
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 *       422:
 *         description: Invalid query parameters
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ValidationError' }
 */
router.get('/users', validate(userOverviewQuerySchema, 'query'), platformController.listUserOverview)

/**
 * @openapi
 * /platform/users/{userId}:
 *   get:
 *     summary: Full detail view of one user
 *     description: >
 *       User profile, every merchant assignment (including historical/
 *       removed), assigned role names, and the union of every permission
 *       those roles grant — reusing Authorization's own role-merging logic,
 *       so this view can never drift from what Authorization enforces.
 *       Read only, platform-admin only.
 *     tags: [Platform]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Full user detail
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data: { $ref: '#/components/schemas/PlatformUserDetails' }
 *       401:
 *         description: Missing or invalid bearer token
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 *       403:
 *         description: Caller is not a platform-admin
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 *       404:
 *         description: User not found
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/NotFoundError' }
 */
router.get('/users/:userId', validate(userIdParamSchema, 'params'), platformController.getUserDetails)

/**
 * @openapi
 * /platform/health:
 *   get:
 *     summary: Current system health
 *     description: >
 *       Live checks, not monitoring history — database and Firebase
 *       connectivity are checked fresh on every call; Surfboard/queue/
 *       storage are honest placeholders (no real client/worker/storage
 *       exists yet). platform-admin only.
 *     tags: [Platform]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Health snapshot
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data: { $ref: '#/components/schemas/PlatformHealth' }
 *       401:
 *         description: Missing or invalid bearer token
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 *       403:
 *         description: Caller is not a platform-admin
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 */
router.get('/health', platformController.getHealth)

/**
 * @openapi
 * /platform/audit:
 *   get:
 *     summary: Paginated audit log browser
 *     description: >
 *       Reads audit_logs only — never writes it (see audit.service.js's
 *       record(), untouched). `severity` filters metadata->>'severity',
 *       since audit_logs has no severity column; no current entries set
 *       it (the write path never has), forward-compatible only.
 *       `before` is always null for the same reason — audit writes only
 *       ever capture one snapshot, never a before/after pair.
 *     tags: [Platform]
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
 *         description: Matches against action, entity type, or metadata content.
 *       - in: query
 *         name: entityType
 *         schema: { type: string, example: merchant }
 *       - in: query
 *         name: entityId
 *         schema: { type: string, format: uuid }
 *       - in: query
 *         name: actorUserId
 *         schema: { type: string, format: uuid }
 *       - in: query
 *         name: action
 *         schema: { type: string, example: merchant.created }
 *       - in: query
 *         name: severity
 *         schema: { type: string }
 *         description: Matches metadata->>'severity' — see description above.
 *       - in: query
 *         name: dateFrom
 *         schema: { type: string, format: date-time }
 *       - in: query
 *         name: dateTo
 *         schema: { type: string, format: date-time }
 *       - in: query
 *         name: sortOrder
 *         schema: { type: string, enum: [asc, desc], default: desc }
 *     responses:
 *       200:
 *         description: A page of audit entries
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: array
 *                       items: { $ref: '#/components/schemas/PlatformAuditEntry' }
 *                     meta: { $ref: '#/components/schemas/Pagination' }
 *       401:
 *         description: Missing or invalid bearer token
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 *       403:
 *         description: Caller is not a platform-admin
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 *       422:
 *         description: Invalid query parameters
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ValidationError' }
 */
router.get('/audit', validate(listAuditQuerySchema, 'query'), auditController.list)

/**
 * @openapi
 * /platform/audit/{id}:
 *   get:
 *     summary: Get one audit entry by id
 *     tags: [Platform]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: The audit entry
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data: { $ref: '#/components/schemas/PlatformAuditEntry' }
 *       401:
 *         description: Missing or invalid bearer token
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 *       403:
 *         description: Caller is not a platform-admin
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 *       404:
 *         description: Audit entry not found
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/NotFoundError' }
 */
router.get('/audit/:id', validate(auditIdParamSchema, 'params'), auditController.getById)

/**
 * @openapi
 * /platform/incidents:
 *   get:
 *     summary: List incidents
 *     tags: [Platform]
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
 *         description: Matches against title or description.
 *       - in: query
 *         name: status
 *         schema: { type: string, enum: [open, investigating, resolved, closed, cancelled] }
 *       - in: query
 *         name: severity
 *         schema: { type: string, enum: [low, medium, high, critical] }
 *       - in: query
 *         name: category
 *         schema: { type: string }
 *       - in: query
 *         name: merchantId
 *         schema: { type: string, format: uuid }
 *       - in: query
 *         name: branchId
 *         schema: { type: string, format: uuid }
 *       - in: query
 *         name: deviceId
 *         schema: { type: string, format: uuid }
 *       - in: query
 *         name: assignedTo
 *         schema: { type: string, format: uuid }
 *       - in: query
 *         name: sortBy
 *         schema: { type: string, enum: [createdAt, updatedAt, severity, status, title] }
 *       - in: query
 *         name: sortOrder
 *         schema: { type: string, enum: [asc, desc] }
 *     responses:
 *       200:
 *         description: A page of incidents
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: array
 *                       items: { $ref: '#/components/schemas/Incident' }
 *                     meta: { $ref: '#/components/schemas/Pagination' }
 *       401:
 *         description: Missing or invalid bearer token
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 *       403:
 *         description: Caller is not a platform-admin
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 *       422:
 *         description: Invalid query parameters
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ValidationError' }
 */
router.get('/incidents', validate(listIncidentsQuerySchema, 'query'), incidentController.list)

/**
 * @openapi
 * /platform/incidents/{id}:
 *   get:
 *     summary: Get an incident by id
 *     tags: [Platform]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: The incident
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data: { $ref: '#/components/schemas/Incident' }
 *       401:
 *         description: Missing or invalid bearer token
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 *       403:
 *         description: Caller is not a platform-admin
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 *       404:
 *         description: Incident not found
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/NotFoundError' }
 */
router.get('/incidents/:id', validate(incidentIdParamSchema, 'params'), incidentController.getById)

/**
 * @openapi
 * /platform/incidents:
 *   post:
 *     summary: Create an incident
 *     tags: [Platform]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [title]
 *             properties:
 *               title: { type: string }
 *               description: { type: string, nullable: true }
 *               severity: { type: string, enum: [low, medium, high, critical], default: medium }
 *               status: { type: string, enum: [open, investigating, resolved, closed, cancelled], default: open }
 *               category: { type: string, nullable: true }
 *               merchantId: { type: string, format: uuid, nullable: true }
 *               branchId: { type: string, format: uuid, nullable: true }
 *               deviceId: { type: string, format: uuid, nullable: true }
 *               assignedTo: { type: string, format: uuid, nullable: true }
 *     responses:
 *       201:
 *         description: Incident created
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data: { $ref: '#/components/schemas/Incident' }
 *       401:
 *         description: Missing or invalid bearer token
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 *       403:
 *         description: Caller is not a platform-admin
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 *       422:
 *         description: Invalid request body
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ValidationError' }
 */
router.post('/incidents', validate(createIncidentSchema), incidentController.create)

/**
 * @openapi
 * /platform/incidents/{id}:
 *   patch:
 *     summary: Update an incident
 *     tags: [Platform]
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
 *               title: { type: string }
 *               description: { type: string, nullable: true }
 *               severity: { type: string, enum: [low, medium, high, critical] }
 *               status: { type: string, enum: [open, investigating, resolved, closed, cancelled] }
 *               category: { type: string, nullable: true }
 *               merchantId: { type: string, format: uuid, nullable: true }
 *               branchId: { type: string, format: uuid, nullable: true }
 *               deviceId: { type: string, format: uuid, nullable: true }
 *               assignedTo: { type: string, format: uuid, nullable: true }
 *     responses:
 *       200:
 *         description: Incident updated
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data: { $ref: '#/components/schemas/Incident' }
 *       401:
 *         description: Missing or invalid bearer token
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 *       403:
 *         description: Caller is not a platform-admin
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 *       404:
 *         description: Incident not found
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/NotFoundError' }
 *       422:
 *         description: Invalid request body
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ValidationError' }
 */
router.patch(
  '/incidents/:id',
  validate(incidentIdParamSchema, 'params'),
  validate(updateIncidentSchema),
  incidentController.update,
)

/**
 * @openapi
 * /platform/incidents/{id}:
 *   delete:
 *     summary: Soft-delete an incident
 *     description: Sets deleted_at; the row is never physically removed.
 *     tags: [Platform]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Incident deleted
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ApiResponse' }
 *       401:
 *         description: Missing or invalid bearer token
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 *       403:
 *         description: Caller is not a platform-admin
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 *       404:
 *         description: Incident not found
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/NotFoundError' }
 */
router.delete('/incidents/:id', validate(incidentIdParamSchema, 'params'), incidentController.remove)

/**
 * @openapi
 * /platform/runbooks:
 *   get:
 *     summary: List runbooks
 *     tags: [Platform]
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
 *         description: Matches against title or description.
 *       - in: query
 *         name: category
 *         schema: { type: string }
 *       - in: query
 *         name: active
 *         schema: { type: string, enum: ['true', 'false'] }
 *       - in: query
 *         name: relatedIncidentType
 *         schema: { type: string }
 *       - in: query
 *         name: sortBy
 *         schema: { type: string, enum: [title, createdAt, updatedAt, version] }
 *       - in: query
 *         name: sortOrder
 *         schema: { type: string, enum: [asc, desc] }
 *     responses:
 *       200:
 *         description: A page of runbooks
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: array
 *                       items: { $ref: '#/components/schemas/Runbook' }
 *                     meta: { $ref: '#/components/schemas/Pagination' }
 *       401:
 *         description: Missing or invalid bearer token
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 *       403:
 *         description: Caller is not a platform-admin
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 *       422:
 *         description: Invalid query parameters
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ValidationError' }
 */
router.get('/runbooks', validate(listRunbooksQuerySchema, 'query'), runbookController.list)

/**
 * @openapi
 * /platform/runbooks/{id}:
 *   get:
 *     summary: Get a runbook by id
 *     tags: [Platform]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: The runbook
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data: { $ref: '#/components/schemas/Runbook' }
 *       401:
 *         description: Missing or invalid bearer token
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 *       403:
 *         description: Caller is not a platform-admin
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 *       404:
 *         description: Runbook not found
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/NotFoundError' }
 */
router.get('/runbooks/:id', validate(runbookIdParamSchema, 'params'), runbookController.getById)

/**
 * @openapi
 * /platform/runbooks:
 *   post:
 *     summary: Create a runbook
 *     description: Always created at version 1, active by default.
 *     tags: [Platform]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [title]
 *             properties:
 *               title: { type: string }
 *               category: { type: string, nullable: true }
 *               description: { type: string, nullable: true }
 *               steps:
 *                 type: array
 *                 items: {}
 *                 description: Free-form ordered procedure content — strings or objects.
 *               relatedIncidentTypes: { type: array, items: { type: string } }
 *     responses:
 *       201:
 *         description: Runbook created
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data: { $ref: '#/components/schemas/Runbook' }
 *       401:
 *         description: Missing or invalid bearer token
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 *       403:
 *         description: Caller is not a platform-admin
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 *       422:
 *         description: Invalid request body
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ValidationError' }
 */
router.post('/runbooks', validate(createRunbookSchema), runbookController.create)

/**
 * @openapi
 * /platform/runbooks/{id}:
 *   patch:
 *     summary: Update a runbook
 *     description: Every successful update bumps `version` by one automatically — not client-settable.
 *     tags: [Platform]
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
 *               title: { type: string }
 *               category: { type: string, nullable: true }
 *               description: { type: string, nullable: true }
 *               steps: { type: array, items: {} }
 *               relatedIncidentTypes: { type: array, items: { type: string } }
 *               active: { type: boolean }
 *     responses:
 *       200:
 *         description: Runbook updated
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data: { $ref: '#/components/schemas/Runbook' }
 *       401:
 *         description: Missing or invalid bearer token
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 *       403:
 *         description: Caller is not a platform-admin
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 *       404:
 *         description: Runbook not found
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/NotFoundError' }
 *       422:
 *         description: Invalid request body
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ValidationError' }
 */
router.patch(
  '/runbooks/:id',
  validate(runbookIdParamSchema, 'params'),
  validate(updateRunbookSchema),
  runbookController.update,
)

/**
 * @openapi
 * /platform/runbooks/{id}:
 *   delete:
 *     summary: Soft-delete a runbook
 *     description: Sets deleted_at; the row is never physically removed.
 *     tags: [Platform]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Runbook deleted
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ApiResponse' }
 *       401:
 *         description: Missing or invalid bearer token
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 *       403:
 *         description: Caller is not a platform-admin
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 *       404:
 *         description: Runbook not found
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/NotFoundError' }
 */
router.delete('/runbooks/:id', validate(runbookIdParamSchema, 'params'), runbookController.remove)

/**
 * @openapi
 * /platform/recommendations:
 *   get:
 *     summary: List recommendations
 *     description: The Incident -> Recommendation -> Runbook link.
 *     tags: [Platform]
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
 *         description: Matches against the recommendation's description.
 *       - in: query
 *         name: incidentId
 *         schema: { type: string, format: uuid }
 *       - in: query
 *         name: runbookId
 *         schema: { type: string, format: uuid }
 *       - in: query
 *         name: status
 *         schema: { type: string, enum: [suggested, applied, dismissed] }
 *       - in: query
 *         name: sortBy
 *         schema: { type: string, enum: [createdAt, updatedAt, status] }
 *       - in: query
 *         name: sortOrder
 *         schema: { type: string, enum: [asc, desc] }
 *     responses:
 *       200:
 *         description: A page of recommendations
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: array
 *                       items: { $ref: '#/components/schemas/Recommendation' }
 *                     meta: { $ref: '#/components/schemas/Pagination' }
 *       401:
 *         description: Missing or invalid bearer token
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 *       403:
 *         description: Caller is not a platform-admin
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 *       422:
 *         description: Invalid query parameters
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ValidationError' }
 */
router.get('/recommendations', validate(listRecommendationsQuerySchema, 'query'), recommendationController.list)

/**
 * @openapi
 * /platform/recommendations/{id}:
 *   get:
 *     summary: Get a recommendation by id
 *     tags: [Platform]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: The recommendation
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data: { $ref: '#/components/schemas/Recommendation' }
 *       401:
 *         description: Missing or invalid bearer token
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 *       403:
 *         description: Caller is not a platform-admin
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 *       404:
 *         description: Recommendation not found
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/NotFoundError' }
 */
router.get(
  '/recommendations/:id',
  validate(recommendationIdParamSchema, 'params'),
  recommendationController.getById,
)

/**
 * @openapi
 * /platform/recommendations:
 *   post:
 *     summary: Create a recommendation
 *     description: Links an existing incident to an existing runbook — both must already exist.
 *     tags: [Platform]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [incidentId, runbookId]
 *             properties:
 *               incidentId: { type: string, format: uuid }
 *               runbookId: { type: string, format: uuid }
 *               description: { type: string, nullable: true }
 *               status: { type: string, enum: [suggested, applied, dismissed], default: suggested }
 *     responses:
 *       201:
 *         description: Recommendation created
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data: { $ref: '#/components/schemas/Recommendation' }
 *       401:
 *         description: Missing or invalid bearer token
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 *       403:
 *         description: Caller is not a platform-admin
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 *       404:
 *         description: incidentId or runbookId does not reference an existing row
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/NotFoundError' }
 *       422:
 *         description: Invalid request body
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ValidationError' }
 */
router.post('/recommendations', validate(createRecommendationSchema), recommendationController.create)

/**
 * @openapi
 * /platform/recommendations/{id}:
 *   patch:
 *     summary: Update a recommendation
 *     tags: [Platform]
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
 *               description: { type: string, nullable: true }
 *               status: { type: string, enum: [suggested, applied, dismissed] }
 *     responses:
 *       200:
 *         description: Recommendation updated
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data: { $ref: '#/components/schemas/Recommendation' }
 *       401:
 *         description: Missing or invalid bearer token
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 *       403:
 *         description: Caller is not a platform-admin
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 *       404:
 *         description: Recommendation not found
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/NotFoundError' }
 *       422:
 *         description: Invalid request body
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ValidationError' }
 */
router.patch(
  '/recommendations/:id',
  validate(recommendationIdParamSchema, 'params'),
  validate(updateRecommendationSchema),
  recommendationController.update,
)

/**
 * @openapi
 * /platform/recommendations/{id}:
 *   delete:
 *     summary: Soft-delete a recommendation
 *     description: Sets deleted_at; the row is never physically removed.
 *     tags: [Platform]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Recommendation deleted
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ApiResponse' }
 *       401:
 *         description: Missing or invalid bearer token
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 *       403:
 *         description: Caller is not a platform-admin
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 *       404:
 *         description: Recommendation not found
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/NotFoundError' }
 */
router.delete(
  '/recommendations/:id',
  validate(recommendationIdParamSchema, 'params'),
  recommendationController.remove,
)

export default router
