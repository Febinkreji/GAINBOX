import { z } from 'zod'

const SEVERITIES = ['low', 'medium', 'high', 'critical']
const STATUSES = ['open', 'investigating', 'resolved', 'closed', 'cancelled']

export const SORTABLE_FIELDS = ['createdAt', 'updatedAt', 'severity', 'status', 'title']

export const createIncidentSchema = z.object({
  title: z.string().trim().min(1).max(255),
  description: z.string().trim().min(1).optional(),
  severity: z.enum(SEVERITIES).optional(),
  status: z.enum(STATUSES).optional(),
  category: z.string().trim().min(1).max(100).optional(),
  merchantId: z.string().uuid().optional(),
  branchId: z.string().uuid().optional(),
  deviceId: z.string().uuid().optional(),
  assignedTo: z.string().uuid().optional(),
})

export const updateIncidentSchema = z
  .object({
    title: z.string().trim().min(1).max(255).optional(),
    description: z.string().trim().min(1).nullable().optional(),
    severity: z.enum(SEVERITIES).optional(),
    status: z.enum(STATUSES).optional(),
    category: z.string().trim().min(1).max(100).nullable().optional(),
    merchantId: z.string().uuid().nullable().optional(),
    branchId: z.string().uuid().nullable().optional(),
    deviceId: z.string().uuid().nullable().optional(),
    assignedTo: z.string().uuid().nullable().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, { message: 'At least one field must be provided' })

export const incidentIdParamSchema = z.object({
  id: z.string().uuid(),
})

export const listIncidentsQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  pageSize: z.coerce.number().int().positive().max(100).optional(),
  search: z.string().trim().min(1).max(255).optional(),
  status: z.enum(STATUSES).optional(),
  severity: z.enum(SEVERITIES).optional(),
  category: z.string().trim().min(1).max(100).optional(),
  merchantId: z.string().uuid().optional(),
  branchId: z.string().uuid().optional(),
  deviceId: z.string().uuid().optional(),
  assignedTo: z.string().uuid().optional(),
  sortBy: z.enum(SORTABLE_FIELDS).optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
})
