import { z } from 'zod'

const BILLING_CYCLES = ['one-time', 'monthly', 'quarterly', 'yearly']
const PLAN_STATUSES = ['active', 'archived']
const SUBSCRIPTION_STATUSES = ['active', 'cancelled', 'expired']

export const PLAN_SORTABLE_FIELDS = ['name', 'price', 'createdAt', 'status']
export const SUBSCRIPTION_SORTABLE_FIELDS = ['createdAt', 'startedAt', 'status']

export const createMembershipPlanSchema = z.object({
  merchantId: z.string().uuid(),
  name: z.string().trim().min(1).max(255),
  description: z.string().trim().max(2000).optional(),
  price: z.coerce.number().nonnegative(),
  currency: z.string().trim().length(3).toUpperCase().optional(),
  billingCycle: z.enum(BILLING_CYCLES),
})

export const updateMembershipPlanSchema = z
  .object({
    name: z.string().trim().min(1).max(255).optional(),
    description: z.string().trim().max(2000).optional(),
    price: z.coerce.number().nonnegative().optional(),
    currency: z.string().trim().length(3).toUpperCase().optional(),
    billingCycle: z.enum(BILLING_CYCLES).optional(),
    status: z.enum(PLAN_STATUSES).optional(),
  })
  .refine((data) => Object.keys(data).length > 0, { message: 'At least one field must be provided' })

export const membershipPlanIdParamSchema = z.object({
  id: z.string().uuid(),
})

export const listMembershipPlansQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  pageSize: z.coerce.number().int().positive().max(100).optional(),
  merchantId: z.string().uuid().optional(),
  search: z.string().trim().min(1).max(255).optional(),
  status: z.enum(PLAN_STATUSES).optional(),
  sortBy: z.enum(PLAN_SORTABLE_FIELDS).optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
})

export const createSubscriptionSchema = z.object({
  membershipPlanId: z.string().uuid(),
  // Existence isn't checked against Users here — that module is still a
  // stub (see the implementation report's "assumptions made"). Format-only
  // validation until User has a real repository to check against.
  customerId: z.string().uuid(),
})

export const subscriptionIdParamSchema = z.object({
  id: z.string().uuid(),
})

export const listSubscriptionsQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  pageSize: z.coerce.number().int().positive().max(100).optional(),
  membershipPlanId: z.string().uuid().optional(),
  customerId: z.string().uuid().optional(),
  status: z.enum(SUBSCRIPTION_STATUSES).optional(),
  sortBy: z.enum(SUBSCRIPTION_SORTABLE_FIELDS).optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
})
