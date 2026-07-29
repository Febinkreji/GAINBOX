import { z } from 'zod'

const STATUSES = ['suggested', 'applied', 'dismissed']

export const SORTABLE_FIELDS = ['createdAt', 'updatedAt', 'status']

export const createRecommendationSchema = z.object({
  incidentId: z.string().uuid(),
  runbookId: z.string().uuid(),
  description: z.string().trim().min(1).optional(),
  status: z.enum(STATUSES).optional(),
})

export const updateRecommendationSchema = z
  .object({
    description: z.string().trim().min(1).nullable().optional(),
    status: z.enum(STATUSES).optional(),
  })
  .refine((data) => Object.keys(data).length > 0, { message: 'At least one field must be provided' })

export const recommendationIdParamSchema = z.object({
  id: z.string().uuid(),
})

export const listRecommendationsQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  pageSize: z.coerce.number().int().positive().max(100).optional(),
  search: z.string().trim().min(1).max(255).optional(),
  incidentId: z.string().uuid().optional(),
  runbookId: z.string().uuid().optional(),
  status: z.enum(STATUSES).optional(),
  sortBy: z.enum(SORTABLE_FIELDS).optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
})
