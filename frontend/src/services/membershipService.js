import { apiClient } from '@/services/apiClient'

/**
 * Membership domain service — plans and subscriptions, powers
 * MembershipPlans (Step 6). GainBox business data, no Surfboard mapping
 * (see backend/src/modules/membership).
 */

export function listMembershipPlans(params) {
  return apiClient.get('/memberships/plans', { params }).then((res) => res.data)
}

export function getMembershipPlan(planId) {
  return apiClient.get(`/memberships/plans/${planId}`).then((res) => res.data.data)
}

export function createMembershipPlan(payload) {
  return apiClient.post('/memberships/plans', payload).then((res) => res.data.data)
}

export function updateMembershipPlan(planId, updates) {
  return apiClient.patch(`/memberships/plans/${planId}`, updates).then((res) => res.data.data)
}

export function deleteMembershipPlan(planId) {
  return apiClient.delete(`/memberships/plans/${planId}`).then((res) => res.data)
}

export function listSubscriptions(params) {
  return apiClient.get('/memberships/subscriptions', { params }).then((res) => res.data)
}

export function getSubscription(subscriptionId) {
  return apiClient.get(`/memberships/subscriptions/${subscriptionId}`).then((res) => res.data.data)
}

export function createSubscription(payload) {
  return apiClient.post('/memberships/subscriptions', payload).then((res) => res.data.data)
}

export function cancelSubscription(subscriptionId) {
  return apiClient.post(`/memberships/subscriptions/${subscriptionId}/cancel`).then((res) => res.data.data)
}
