import { merchantStaffRepository } from './merchantStaff.repository.js'
import { auditService } from '../audit/audit.service.js'
import { outboxService } from '../outbox/outbox.service.js'
import { withTransaction } from '../../database/connection.js'
import { NotFoundError, ConflictError } from '../../errors/index.js'

/**
 * The Merchant Portal's own staff-management surface (Merchant Owner/Staff
 * acting on their own merchant — distinct from Platform Control Center's
 * read-only cross-merchant roster view, which already reuses
 * findRosterForMerchant directly). `remove` is the one write this module
 * was still missing: a status transition ('active' -> 'removed'), not a
 * delete, same reasoning merchant_staff's own schema comment documents.
 */
export const merchantStaffService = {
  async listForMerchant(merchantId) {
    return merchantStaffRepository.findRosterForMerchant(merchantId)
  },

  async remove(id, actorUserId) {
    const existing = await merchantStaffRepository.findById(id)

    if (!existing) {
      throw new NotFoundError('Staff assignment not found')
    }

    if (existing.status === 'removed') {
      throw new ConflictError('This staff member has already been removed')
    }

    return withTransaction(async (client) => {
      const updated = await merchantStaffRepository.updateStatus(id, 'removed', client)

      await auditService.record(
        {
          entityType: 'merchantStaff',
          entityId: id,
          action: 'merchantStaff.removed',
          actorUserId: actorUserId ?? null,
          metadata: { merchantId: existing.merchantId, userId: existing.userId },
        },
        client,
      )

      await outboxService.publish(
        { eventType: 'MerchantStaffRemoved', aggregateType: 'merchantStaff', aggregateId: id, payload: updated },
        client,
      )

      return updated
    })
  },
}
