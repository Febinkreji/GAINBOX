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

// IANA timezone identifiers, e.g. "Asia/Kolkata", "Etc/UTC",
// "America/Argentina/Buenos_Aires" — 2-3 slash-separated segments. Not
// validated against the full IANA database (that's an external, evolving
// list); this only rejects obviously malformed input.
const TIMEZONE_PATTERN = /^[A-Za-z_]+\/[A-Za-z_]+(\/[A-Za-z_]+)?$/

export const SORTABLE_FIELDS = ['businessName', 'createdAt', 'status']

// Shared shape for "the merchant's own details" — reused by
// createMerchantSchema (standalone POST, if ever called directly) and by
// merchantOnboarding.validation.js's nested `merchant` field, so the two
// never define these rules differently.
export const merchantDetailsSchema = z.object({
  businessName: z.string().trim().min(1).max(255),
  legalName: z.string().trim().min(1).max(255).optional(),
  businessType: z.enum(BUSINESS_TYPES),
  contactEmail: z.string().trim().toLowerCase().email().optional(),
  contactPhone: z.string().trim().min(7).max(20).optional(),
  address: z.string().trim().min(1).max(500).optional(),
  timezone: z.string().trim().regex(TIMEZONE_PATTERN, 'Must be an IANA timezone, e.g. Asia/Kolkata').optional(),
  currency: z.string().trim().toUpperCase().length(3, 'Must be a 3-letter ISO 4217 code').optional(),
  country: z.string().trim().min(1).max(100).optional(),
  // Business registration number — required by Surfboard's Create Merchant
  // API, but format varies by country (Surfboard validates format on its
  // own side), so this only rejects blank/oversized input, not a shape.
  corporateId: z.string().trim().min(1).max(50).optional(),
})

// Deliberately does NOT accept `status` — a merchant is always born
// 'pending' (see merchant.service.js's own documented business rule,
// enforced by never passing status through to INSERT). Accepting it here
// would contradict that pre-existing, production rule.
export const createMerchantSchema = merchantDetailsSchema

export const updateMerchantSchema = z
  .object({
    businessName: z.string().trim().min(1).max(255).optional(),
    legalName: z.string().trim().min(1).max(255).nullable().optional(),
    businessType: z.enum(BUSINESS_TYPES).optional(),
    status: z.enum(STATUSES).optional(),
    contactEmail: z.string().trim().toLowerCase().email().optional(),
    contactPhone: z.string().trim().min(7).max(20).optional(),
    address: z.string().trim().min(1).max(500).nullable().optional(),
    timezone: z.string().trim().regex(TIMEZONE_PATTERN).nullable().optional(),
    currency: z.string().trim().toUpperCase().length(3).optional(),
    country: z.string().trim().min(1).max(100).nullable().optional(),
    corporateId: z.string().trim().min(1).max(50).nullable().optional(),
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
