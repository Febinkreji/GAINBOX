import { z } from 'zod'

export const listAuditQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  pageSize: z.coerce.number().int().positive().max(100).optional(),
  search: z.string().trim().min(1).max(255).optional(),
  entityType: z.string().trim().min(1).max(50).optional(),
  entityId: z.string().uuid().optional(),
  actorUserId: z.string().uuid().optional(),
  action: z.string().trim().min(1).max(100).optional(),
  severity: z.string().trim().min(1).max(20).optional(),
  dateFrom: z.coerce.date().optional(),
  dateTo: z.coerce.date().optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
})

export const auditIdParamSchema = z.object({
  id: z.string().uuid(),
})
