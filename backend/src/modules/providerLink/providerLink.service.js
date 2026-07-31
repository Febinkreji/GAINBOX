import { providerLinkRepository } from './providerLink.repository.js'
import { ConflictError, NotFoundError } from '../../errors/index.js'
import { logger } from '../../logger/logger.js'

/**
 * Business rules over `provider_links` (migration 0016) — the single
 * mapping between a GainBox entity and its id in an external provider
 * (Surfboard today). Every future sync service (Merchant this sprint,
 * Store/Device later) depends on this service, never on the repository
 * directly, matching every other module in this codebase.
 */
export const providerLinkService = {
  /**
   * Duplicate Prevention lives here, not just in the DB: even though the
   * unique index (`provider_links_entity_provider_uq`) makes a second
   * *row* impossible, checking first means the caller never even attempts
   * the (expensive, external) provider call in the first place — see
   * merchantSync.service.js's attemptSync().
   */
  async createLink({ entityType, entityId, provider, externalId, metadata }) {
    const existing = await providerLinkRepository.findByEntity(entityType, entityId, provider)

    if (existing) {
      throw new ConflictError(`A ${provider} mapping already exists for this ${entityType}`)
    }

    try {
      return await providerLinkRepository.create({ entityType, entityId, provider, externalId, metadata })
    } catch (error) {
      if (error.code === '23505') {
        // Lost a race against a concurrent createLink for the same
        // entity/provider — the unique index caught what the check above
        // couldn't (a TOCTOU gap). Same ConflictError either way, so
        // callers only ever have one case to handle.
        throw new ConflictError(`A ${provider} mapping already exists for this ${entityType}`)
      }

      throw error
    }
  },

  async findLink(id) {
    const link = await providerLinkRepository.findById(id)

    if (!link) {
      throw new NotFoundError('Provider link not found')
    }

    return link
  },

  async updateLink(id, updates) {
    const updated = await providerLinkRepository.update(id, updates)

    if (!updated) {
      throw new NotFoundError('Provider link not found')
    }

    logger.info({ providerLinkId: id, entityType: updated.entityType, entityId: updated.entityId }, 'Provider Link Updated')

    return updated
  },

  async deleteLink(id) {
    const deleted = await providerLinkRepository.softDelete(id)

    if (!deleted) {
      throw new NotFoundError('Provider link not found')
    }

    return deleted
  },

  async findByProvider(provider, pagination) {
    return providerLinkRepository.findByProvider(provider, pagination)
  },

  async countByProvider(provider) {
    return providerLinkRepository.countByProvider(provider)
  },

  async findByEntity(entityType, entityId, provider) {
    return providerLinkRepository.findByEntity(entityType, entityId, provider)
  },

  /**
   * Reverse lookup — "which GainBox entity does this provider's id belong
   * to." First real caller: the Surfboard "Application Merchant Created"
   * webhook, which only has Surfboard's own applicationId to correlate
   * back to a merchant (see webhook.service.js).
   */
  async findByExternalId(provider, externalId) {
    return providerLinkRepository.findByExternalId(provider, externalId)
  },

  /**
   * Read-only existence check — returns the mapping itself (or null),
   * rather than a bare boolean, since every caller so far (Duplicate
   * Prevention in merchantSync.service.js) immediately needs the mapping's
   * `externalId` the moment one exists, not just the fact that it does.
   */
  async checkExistingMapping(entityType, entityId, provider) {
    return providerLinkRepository.findByEntity(entityType, entityId, provider)
  },
}
