import { z } from 'zod'

const MERCHANT_STATUSES = ['pending', 'active', 'suspended']
const USER_STATUSES = ['active', 'invited', 'disabled']
const ROLE_NAMES = ['platform-admin', 'merchant-owner', 'merchant-staff', 'viewer', 'customer']

export const MERCHANT_OVERVIEW_SORT_FIELDS = ['businessName', 'createdAt', 'status']
export const USER_OVERVIEW_SORT_FIELDS = ['displayName', 'email', 'createdAt', 'status']

export const merchantOverviewQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  pageSize: z.coerce.number().int().positive().max(100).optional(),
  search: z.string().trim().min(1).max(255).optional(),
  status: z.enum(MERCHANT_STATUSES).optional(),
  sortBy: z.enum(MERCHANT_OVERVIEW_SORT_FIELDS).optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
})

export const merchantIdParamSchema = z.object({
  merchantId: z.string().uuid(),
})

export const userOverviewQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  pageSize: z.coerce.number().int().positive().max(100).optional(),
  search: z.string().trim().min(1).max(255).optional(),
  status: z.enum(USER_STATUSES).optional(),
  role: z.enum(ROLE_NAMES).optional(),
  sortBy: z.enum(USER_OVERVIEW_SORT_FIELDS).optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
})

export const userIdParamSchema = z.object({
  userId: z.string().uuid(),
})
