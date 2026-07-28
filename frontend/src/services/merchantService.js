import { notImplemented } from '@/services/notImplemented'

/**
 * Merchant Profile domain service.
 *
 * Surfboard capabilities covered here:
 * - Merchant Creation    — onboard a gym or meal provider as a Surfboard merchant.
 * - Merchant Functions   — update merchant profile, contact details, and business branding.
 * - Multi Merchant Group — group multiple branches/merchants under one business.
 *
 * Powers the Merchant Profile page. Every function is a stub — it returns
 * `notImplemented()` and sketches the eventual backend call in a comment.
 * Once implemented, these will call the GainBox backend via `apiClient`
 * from './apiClient' — never Surfboard directly.
 */

/**
 * Surfboard capability: Merchant Creation.
 * @param {{ businessName: string, ownerName: string, email: string, phone: string, businessType: 'gym' | 'meal-provider' }} payload
 */
export function createMerchant(payload) {
  // Future: return apiClient.post('/merchants', payload).then((res) => res.data)
  return notImplemented('Merchant Creation', payload)
}

/**
 * Surfboard capability: Merchant Functions (read).
 * @param {string} merchantId
 */
export function getMerchantProfile(merchantId) {
  // Future: return apiClient.get(`/merchants/${merchantId}`).then((res) => res.data)
  return notImplemented('Merchant Functions', { merchantId })
}

/**
 * Surfboard capability: Merchant Functions (update profile/contact details).
 * @param {string} merchantId
 * @param {{ businessName?: string, contactEmail?: string, contactPhone?: string }} updates
 */
export function updateMerchantProfile(merchantId, updates) {
  // Future: return apiClient.patch(`/merchants/${merchantId}`, updates).then((res) => res.data)
  return notImplemented('Merchant Functions', { merchantId, updates })
}

/**
 * Surfboard capability: Merchant Functions (business-level branding — logo, colors).
 * Distinct from `deviceService.configureDeviceBranding`, which brands the payment terminal itself.
 * @param {string} merchantId
 * @param {{ logoUrl?: string, primaryColor?: string }} branding
 */
export function updateMerchantBranding(merchantId, branding) {
  // Future: return apiClient.patch(`/merchants/${merchantId}/branding`, branding).then((res) => res.data)
  return notImplemented('Merchant Functions', { merchantId, branding })
}

/**
 * Surfboard capability: Multi Merchant Group.
 * @param {{ groupName: string, merchantIds: string[] }} payload
 */
export function createMerchantGroup(payload) {
  // Future: return apiClient.post('/merchant-groups', payload).then((res) => res.data)
  return notImplemented('Multi Merchant Group', payload)
}

/**
 * Surfboard capability: Multi Merchant Group.
 * @param {string} groupId
 */
export function listMerchantsInGroup(groupId) {
  // Future: return apiClient.get(`/merchant-groups/${groupId}/merchants`).then((res) => res.data)
  return notImplemented('Multi Merchant Group', { groupId })
}
