import { z } from 'zod'

const BUSINESS_TYPES = [
  'gym',
  'meal-provider',
  'wellness-center',
  'yoga-studio',
  'physio-clinic',
  'nutrition-center',
  'fitness-chain',
  'other',
]

const STATUSES = ['pending', 'active', 'suspended']

export const SORTABLE_FIELDS = ['businessName', 'createdAt', 'status']

export const createMerchantSchema = z.object({
  businessName: z.string().trim().min(1).max(255),
  businessType: z.enum(BUSINESS_TYPES),
  contactEmail: z.string().trim().toLowerCase().email().optional(),
  contactPhone: z.string().trim().min(7).max(20).optional(),
})

export const updateMerchantSchema = z
  .object({
    businessName: z.string().trim().min(1).max(255).optional(),
    businessType: z.enum(BUSINESS_TYPES).optional(),
    status: z.enum(STATUSES).optional(),
    contactEmail: z.string().trim().toLowerCase().email().optional(),
    contactPhone: z.string().trim().min(7).max(20).optional(),
  })
  .refine((data) => Object.keys(data).length > 0, { message: 'At least one field must be provided' })

export const merchantIdParamSchema = z.object({
  id: z.string().uuid(),
})

export const listMerchantsQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  pageSize: z.coerce.number().int().positive().max(100).optional(),
  search: z.string().trim().min(1).max(255).optional(),
  status: z.enum(STATUSES).optional(),
  businessType: z.enum(BUSINESS_TYPES).optional(),
  sortBy: z.enum(SORTABLE_FIELDS).optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
})
