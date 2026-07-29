import { firebaseIdentityAdapter } from './adapters/firebaseIdentityAdapter.js'

/**
 * Composition point for IdentityProviderPort (see identityProvider.port.js).
 * auth.middleware.js imports `identityProvider` from here, never
 * `firebaseIdentityAdapter` directly — swapping identity providers later
 * means changing this one binding. Mirrors merchant.providers.js /
 * branch.providers.js / device.providers.js exactly.
 */
export const identityProvider = firebaseIdentityAdapter
