import { z } from 'zod'
import { merchantDetailsSchema } from '../merchant/merchant.validation.js'

/**
 * Feature 1 + Feature 2's combined payload for POST /platform/merchants —
 * `merchant` reuses merchantDetailsSchema exactly (see merchant.validation.js),
 * so the two never validate "what a merchant's details look like"
 * differently. The owner fields are Feature 2's "assign initial owner"
 * step; `ownerDisplayName` is optional since Identity Sync (not this
 * schema) is what actually determines a real display name once the
 * invited person eventually signs in.
 *
 * `ownerEmail` is itself optional (Platform Administration phase): a
 * Platform Admin may create a merchant alone and invite its owner later via
 * the standalone POST /platform/invitations, rather than always doing both
 * atomically in one call — see merchantOnboarding.service.js's onboard().
 */
export const onboardMerchantSchema = z.object({
  merchant: merchantDetailsSchema,
  ownerEmail: z.string().trim().toLowerCase().email().optional(),
  ownerDisplayName: z.string().trim().min(1).max(255).optional(),
})
