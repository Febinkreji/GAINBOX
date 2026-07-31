import { userRepository } from './user.repository.js'
import { auditService } from '../audit/audit.service.js'
import { outboxService } from '../outbox/outbox.service.js'
import { withTransaction } from '../../database/connection.js'
import { NotFoundError, ConflictError } from '../../errors/index.js'

export const userService = {
  async list(_pagination) {
    return userRepository.findAll()
  },

  async getById(id) {
    return userRepository.findById(id)
  },

  async create(data) {
    return userRepository.create(data)
  },

  async update(id, data) {
    return userRepository.update(id, data)
  },

  async remove(id) {
    return userRepository.delete(id)
  },

  /**
   * Platform Administration's "Activate"/"Deactivate" user actions (Step
   * 4) — the only genuinely new business logic this module gains this
   * phase (list/getById/create/update/remove above are pre-existing
   * stubs, untouched). Same shape as every other lifecycle action in this
   * codebase: fetch-and-guard, write + audit + outbox inside one
   * transaction (see merchantStaff.service.js's remove() for the same
   * pattern).
   */
  async activate(id, actorUserId) {
    const existing = await userRepository.findById(id)

    if (!existing) {
      throw new NotFoundError('User not found')
    }

    if (existing.status === 'active') {
      throw new ConflictError('User is already active')
    }

    return withTransaction(async (client) => {
      const updated = await userRepository.update(id, { status: 'active' }, client)

      await auditService.record(
        {
          entityType: 'user',
          entityId: id,
          action: 'user.activated',
          actorUserId: actorUserId ?? null,
          metadata: { previousStatus: existing.status },
        },
        client,
      )

      await outboxService.publish(
        { eventType: 'UserActivated', aggregateType: 'user', aggregateId: id, payload: updated },
        client,
      )

      return updated
    })
  },

  async deactivate(id, actorUserId) {
    const existing = await userRepository.findById(id)

    if (!existing) {
      throw new NotFoundError('User not found')
    }

    if (existing.status === 'disabled') {
      throw new ConflictError('User is already disabled')
    }

    return withTransaction(async (client) => {
      const updated = await userRepository.update(id, { status: 'disabled' }, client)

      await auditService.record(
        {
          entityType: 'user',
          entityId: id,
          action: 'user.deactivated',
          actorUserId: actorUserId ?? null,
          metadata: { previousStatus: existing.status },
        },
        client,
      )

      await outboxService.publish(
        { eventType: 'UserDeactivated', aggregateType: 'user', aggregateId: id, payload: updated },
        client,
      )

      return updated
    })
  },
}
