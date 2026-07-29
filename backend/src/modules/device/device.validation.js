import { z } from 'zod'

const STATUSES = ['registered', 'active', 'offline', 'deactivated']

export const SORTABLE_FIELDS = ['label', 'createdAt', 'status']

// branding_config/tip_config are provider-defined JSONB (see migration
// 0010) — validated as "some JSON object", not a fixed shape, same
// reasoning as webhook.validation.js's payload schema.
const jsonObjectSchema = z.record(z.string(), z.unknown())

export const createDeviceSchema = z.object({
  branchId: z.string().uuid(),
  label: z.string().trim().min(1).max(255),
  brandingConfig: jsonObjectSchema.optional(),
  tipConfig: jsonObjectSchema.optional(),
})

export const updateDeviceSchema = z
  .object({
    label: z.string().trim().min(1).max(255).optional(),
    status: z.enum(STATUSES).optional(),
    brandingConfig: jsonObjectSchema.optional(),
    tipConfig: jsonObjectSchema.optional(),
  })
  .refine((data) => Object.keys(data).length > 0, { message: 'At least one field must be provided' })

export const deviceIdParamSchema = z.object({
  id: z.string().uuid(),
})

export const listDevicesQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  pageSize: z.coerce.number().int().positive().max(100).optional(),
  branchId: z.string().uuid().optional(),
  search: z.string().trim().min(1).max(255).optional(),
  status: z.enum(STATUSES).optional(),
  sortBy: z.enum(SORTABLE_FIELDS).optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
})
