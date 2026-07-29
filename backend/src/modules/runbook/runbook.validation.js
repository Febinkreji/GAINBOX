import { z } from 'zod'

export const SORTABLE_FIELDS = ['title', 'createdAt', 'updatedAt', 'version']

// Free-form procedure content, matching the JSONB column's design intent
// (see migration 0022) — a step can be a plain instruction string or a
// richer object (e.g. { instruction, link }); this schema only guarantees
// "an array", not one fixed step shape.
const stepsSchema = z.array(z.union([z.string(), z.record(z.string(), z.any())]))

export const createRunbookSchema = z.object({
  title: z.string().trim().min(1).max(255),
  category: z.string().trim().min(1).max(100).optional(),
  description: z.string().trim().min(1).optional(),
  steps: stepsSchema.optional(),
  relatedIncidentTypes: z.array(z.string().trim().min(1).max(100)).optional(),
})

export const updateRunbookSchema = z
  .object({
    title: z.string().trim().min(1).max(255).optional(),
    category: z.string().trim().min(1).max(100).nullable().optional(),
    description: z.string().trim().min(1).nullable().optional(),
    steps: stepsSchema.optional(),
    relatedIncidentTypes: z.array(z.string().trim().min(1).max(100)).optional(),
    active: z.boolean().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, { message: 'At least one field must be provided' })

export const runbookIdParamSchema = z.object({
  id: z.string().uuid(),
})

export const listRunbooksQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  pageSize: z.coerce.number().int().positive().max(100).optional(),
  search: z.string().trim().min(1).max(255).optional(),
  category: z.string().trim().min(1).max(100).optional(),
  // z.coerce.boolean() is a trap here: Boolean("false") === true, so a
  // literal ?active=false query string would coerce to true. Enumerating
  // the two valid string values and transforming explicitly avoids that.
  active: z.enum(['true', 'false']).transform((value) => value === 'true').optional(),
  relatedIncidentType: z.string().trim().min(1).max(100).optional(),
  sortBy: z.enum(SORTABLE_FIELDS).optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
})
