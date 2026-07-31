export const ROUTES = {
  LOGIN: '/login',
  DASHBOARD: '/',
  MERCHANT_PROFILE: '/merchant-profile',
  BRANCHES: '/branches',
  DEVICES: '/devices',
  MEMBERSHIP_PLANS: '/membership-plans',
  STAFF: '/staff',
  PAYMENTS: '/payments',
  ANALYTICS: '/analytics',
  SETTINGS: '/settings',
  INTEGRATION_CENTER: '/integration-center',
  PLATFORM_DASHBOARD: '/platform/dashboard',
  PLATFORM_MERCHANTS: '/platform/merchants',
  PLATFORM_MERCHANT_DETAILS: '/platform/merchants/:merchantId',
  PLATFORM_USERS: '/platform/users',
  PLATFORM_USER_DETAILS: '/platform/users/:userId',
  PLATFORM_INVITATIONS: '/platform/invitations',
  ACCEPT_INVITATION: '/accept-invitation',
}

export function platformMerchantDetailsPath(merchantId) {
  return `/platform/merchants/${merchantId}`
}

export function platformUserDetailsPath(userId) {
  return `/platform/users/${userId}`
}

/**
 * The shareable invitation link (see pages/AcceptInvitation) — contains
 * only the plaintext token that already existed at invitation creation
 * time, nothing else. window.location.origin (not a hardcoded host) so
 * this is correct in every environment without new config.
 */
export function invitationAcceptanceLink(token) {
  return `${window.location.origin}${ROUTES.ACCEPT_INVITATION}?token=${token}`
}
