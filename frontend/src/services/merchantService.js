import { apiClient } from '@/services/apiClient'

/**
 * Merchant Profile domain service — powers MerchantProfile (Step 8). Calls
 * the merchant-context routes (/merchant/profile) — the backend derives
 * the merchant from the authenticated user, so nothing here ever passes a
 * merchantId. Merchant *creation* isn't here: onboarding a new merchant is
 * a Platform Control Center action (POST /platform/merchants), not
 * something a Merchant Portal user does to themselves.
 */

export function getMerchantProfile() {
  return apiClient.get('/merchant/profile').then((res) => res.data.data)
}

export function updateMerchantProfile(updates) {
  return apiClient.patch('/merchant/profile', updates).then((res) => res.data.data)
}
