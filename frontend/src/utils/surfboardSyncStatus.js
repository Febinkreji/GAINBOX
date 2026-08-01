// Phase 2 — Store & Device Integration. Shared "Pending / Synced / Failed"
// badge derivation for a branch/device's Surfboard sync status — used by
// Platform Admin's MerchantDetails page and the Merchant Portal's
// Branches/Devices pages alike, so the same rules render the same badge
// everywhere (a provider_link existing means synced, regardless of which
// detail Surfboard has told us since).
export const ENTITY_SYNC_TONE = { synced: 'success', pending: 'brand', failed: 'danger' }
export const ENTITY_SYNC_LABEL = { synced: 'Synced', pending: 'Pending', failed: 'Failed' }

export function deriveEntitySyncState(sync) {
  if (!sync) return 'pending'
  if (sync.connected) return 'synced'
  if (sync.syncStatus === 'failed') return 'failed'
  return 'pending'
}
