import { z } from 'zod'

const STATUSES = ['active', 'inactive']

export const SORTABLE_FIELDS = ['name', 'createdAt', 'status']

export const createBranchSchema = z.object({
  merchantId: z.string().uuid(),
  name: z.string().trim().min(1).max(255),
  address: z.string().trim().min(1).max(500).optional(),
  city: z.string().trim().min(1).max(100),
  state: z.string().trim().min(1).max(100).optional(),
  country: z.string().trim().min(1).max(100).optional(),
  postalCode: z.string().trim().min(3).max(20).optional(),
})

export const updateBranchSchema = z
  .object({
    name: z.string().trim().min(1).max(255).optional(),
    address: z.string().trim().min(1).max(500).optional(),
    city: z.string().trim().min(1).max(100).optional(),
    state: z.string().trim().min(1).max(100).optional(),
    country: z.string().trim().min(1).max(100).optional(),
    postalCode: z.string().trim().min(3).max(20).optional(),
    status: z.enum(STATUSES).optional(),
  })
  .refine((data) => Object.keys(data).length > 0, { message: 'At least one field must be provided' })

export const branchIdParamSchema = z.object({
  id: z.string().uuid(),
})

export const listBranchesQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  pageSize: z.coerce.number().int().positive().max(100).optional(),
  merchantId: z.string().uuid().optional(),
  search: z.string().trim().min(1).max(255).optional(),
  status: z.enum(STATUSES).optional(),
  sortBy: z.enum(SORTABLE_FIELDS).optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
})
