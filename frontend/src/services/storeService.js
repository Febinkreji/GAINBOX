import { apiClient } from '@/services/apiClient'

/**
 * Branch domain service — Surfboard calls this concept a "Store" (hence
 * the filename), GainBox calls it a "Branch"; the backend route is
 * /branches. Powers the Branches page (Step 4).
 */

export function listBranches(params) {
  return apiClient.get('/branches', { params }).then((res) => res.data)
}

export function getBranch(branchId) {
  return apiClient.get(`/branches/${branchId}`).then((res) => res.data.data)
}

export function createBranch(payload) {
  return apiClient.post('/branches', payload).then((res) => res.data.data)
}

export function updateBranch(branchId, updates) {
  return apiClient.patch(`/branches/${branchId}`, updates).then((res) => res.data.data)
}

export function deleteBranch(branchId) {
  return apiClient.delete(`/branches/${branchId}`).then((res) => res.data)
}

// Phase 2 — Store & Device Integration. Read-only: the backend route is
// ownership-gated (branch.read + requireOwnership), not platform-admin-
// gated, so the Merchant Portal can call this directly for its own
// branch — no sync/admin action exists here (that stays Platform Admin
// only, see platformService.js's triggerBranchSync).
export function getBranchSyncStatus(branchId) {
  return apiClient.get(`/integrations/surfboard/branches/${branchId}/status`).then((res) => res.data.data)
}
