/**
 * Some `provider_links` rows have their `metadata` double-wrapped — an
 * older write path stored the whole adapter result object
 * (`{ externalId, status, metadata: {...real fields...} }`) instead of
 * just its `metadata` sub-object (see merchantSync.service.js's own fix
 * for the write-side of this). This unwraps defensively so every reader
 * works for both the old nested shape and the correct flat one, without
 * needing a data migration — used by merchant.service.js, merchantSync
 * .service.js, and the branch/device sync services.
 *
 * @param {{ metadata?: object|null }|null} link - a provider_links row (or null)
 * @returns {object|null}
 */
export function unwrapProviderMetadata(link) {
  return link?.metadata?.metadata ?? link?.metadata ?? null
}
