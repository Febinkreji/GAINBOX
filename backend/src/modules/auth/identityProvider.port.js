/**
 * Interface an identity provider must implement. Business modules and
 * middleware depend on this shape, not on Firebase (or any provider)
 * directly — swapping providers means writing a new adapter that satisfies
 * this same interface, exactly like MerchantProviderPort/StoreProviderPort
 * do for Surfboard.
 *
 * Authentication only verifies *who* the caller is — it returns an
 * identity, never a role or permission. Authorization (RBAC, policies) is
 * a separate, not-yet-built layer that will sit in front of business
 * modules and consume this identity, not the other way around.
 *
 * @typedef {object} AuthenticatedIdentity
 * @property {string} id - Stable identifier for the identity (Firebase uid).
 * @property {string|null} email
 * @property {boolean} emailVerified
 * @property {string|null} name
 *
 * @typedef {object} IdentityProviderPort
 * @property {(token: string) => Promise<AuthenticatedIdentity>} verifyIdToken
 */
export const IDENTITY_PROVIDER_PORT_SHAPE = ['verifyIdToken']
