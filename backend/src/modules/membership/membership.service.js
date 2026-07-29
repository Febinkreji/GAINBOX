import { membershipPlanRepository } from './membershipPlan.repository.js'
import { subscriptionRepository } from './subscription.repository.js'
import { merchantRepository } from '../merchant/merchant.repository.js'
import { auditService } from '../audit/audit.service.js'
import { outboxService } from '../outbox/outbox.service.js'
import { withTransaction } from '../../database/connection.js'
import { NotFoundError, ConflictError } from '../../errors/index.js'
import { parsePagination, buildPaginationMeta } from '../../utils/pagination.js'

/**
 * No Surfboard integration point in this module — plans and subscriptions
 * are pure GainBox concepts (Surfboard has no notion of a "membership").
 * This is a deliberate omission, not an oversight: see the original domain
 * design and this task's explicit exclusion of Surfboard synchronization.
 *
 * Business rules live here, not in the repository or controller, same
 * shape as Merchant/Branch/Device:
 *  - a plan cannot exist without a real, non-deleted merchant;
 *  - a subscription cannot exist without a real, non-deleted, non-archived
 *    plan — archived plans are closed to new subscribers;
 *  - a subscription can only be cancelled while active (idempotent
 *    double-cancel attempts get a precise 409, not a silent no-op);
 *  - create/update/delete are audited and outboxed in the same DB
 *    transaction as the write itself.
 *
 * Authorization note: nothing here inspects `actorUserId` beyond recording
 * it — no role/permission check exists in this module, by design, per the
 * "business modules never contain authorization logic" architecture. A
 * future Authorization middleware/policy engine sits in front of these
 * calls, not inside them.
 */
export const membershipService = {
  async listPlans(query, accessibleMerchantIds) {
    const pagination = parsePagination(query)
    const filters = {
      merchantId: query.merchantId,
      merchantIds: accessibleMerchantIds,
      status: query.status,
      search: query.search,
      sortBy: query.sortBy,
      sortOrder: query.sortOrder,
    }

    const [items, total] = await Promise.all([
      membershipPlanRepository.findAll(filters, pagination),
      membershipPlanRepository.count(filters),
    ])

    return {
      items,
      meta: buildPaginationMeta({ page: pagination.page, pageSize: pagination.pageSize, total }),
    }
  },

  async getPlanById(id) {
    const plan = await membershipPlanRepository.findById(id)

    if (!plan) {
      throw new NotFoundError('Membership plan not found')
    }

    return plan
  },

  async createPlan(data, actorUserId) {
    const merchant = await merchantRepository.findById(data.merchantId)

    if (!merchant) {
      throw new NotFoundError('Cannot create a membership plan for a merchant that does not exist')
    }

    return withTransaction(async (client) => {
      const created = await membershipPlanRepository.create({ ...data, createdBy: actorUserId ?? null }, client)

      await auditService.record(
        {
          entityType: 'membershipPlan',
          entityId: created.id,
          action: 'membershipPlan.created',
          actorUserId: actorUserId ?? null,
          metadata: { merchantId: created.merchantId, name: created.name, price: created.price },
        },
        client,
      )

      await outboxService.publish(
        {
          eventType: 'MembershipPlanCreated',
          aggregateType: 'membershipPlan',
          aggregateId: created.id,
          payload: created,
        },
        client,
      )

      return created
    })
  },

  async updatePlan(id, data, actorUserId) {
    const existing = await membershipPlanRepository.findById(id)

    if (!existing) {
      throw new NotFoundError('Membership plan not found')
    }

    return withTransaction(async (client) => {
      const updated = await membershipPlanRepository.update(id, { ...data, updatedBy: actorUserId ?? null }, client)

      await auditService.record(
        {
          entityType: 'membershipPlan',
          entityId: id,
          action: 'membershipPlan.updated',
          actorUserId: actorUserId ?? null,
          metadata: { changes: data },
        },
        client,
      )

      await outboxService.publish(
        {
          eventType: 'MembershipPlanUpdated',
          aggregateType: 'membershipPlan',
          aggregateId: id,
          payload: updated,
        },
        client,
      )

      return updated
    })
  },

  async removePlan(id, actorUserId) {
    const existing = await membershipPlanRepository.findById(id)

    if (!existing) {
      throw new NotFoundError('Membership plan not found')
    }

    await withTransaction(async (client) => {
      await membershipPlanRepository.softDelete(id, client)

      await auditService.record(
        {
          entityType: 'membershipPlan',
          entityId: id,
          action: 'membershipPlan.deleted',
          actorUserId: actorUserId ?? null,
          metadata: {},
        },
        client,
      )

      await outboxService.publish(
        {
          eventType: 'MembershipPlanDeleted',
          aggregateType: 'membershipPlan',
          aggregateId: id,
          payload: { id },
        },
        client,
      )
    })
  },

  async listSubscriptions(query) {
    const pagination = parsePagination(query)
    const filters = {
      membershipPlanId: query.membershipPlanId,
      customerId: query.customerId,
      status: query.status,
      sortBy: query.sortBy,
      sortOrder: query.sortOrder,
    }

    const [items, total] = await Promise.all([
      subscriptionRepository.findAll(filters, pagination),
      subscriptionRepository.count(filters),
    ])

    return {
      items,
      meta: buildPaginationMeta({ page: pagination.page, pageSize: pagination.pageSize, total }),
    }
  },

  async getSubscriptionById(id) {
    const subscription = await subscriptionRepository.findById(id)

    if (!subscription) {
      throw new NotFoundError('Subscription not found')
    }

    return subscription
  },

  async createSubscription(data, actorUserId) {
    const plan = await membershipPlanRepository.findById(data.membershipPlanId)

    if (!plan) {
      throw new NotFoundError('Cannot subscribe to a membership plan that does not exist')
    }

    if (plan.status === 'archived') {
      throw new ConflictError('Cannot subscribe to an archived membership plan')
    }

    return withTransaction(async (client) => {
      const created = await subscriptionRepository.create(data, client)

      await auditService.record(
        {
          entityType: 'subscription',
          entityId: created.id,
          action: 'subscription.created',
          actorUserId: actorUserId ?? null,
          metadata: { membershipPlanId: created.membershipPlanId, customerId: created.customerId },
        },
        client,
      )

      await outboxService.publish(
        {
          eventType: 'SubscriptionCreated',
          aggregateType: 'subscription',
          aggregateId: created.id,
          payload: created,
        },
        client,
      )

      return created
    })
  },

  async cancelSubscription(id, actorUserId) {
    const existing = await subscriptionRepository.findById(id)

    if (!existing) {
      throw new NotFoundError('Subscription not found')
    }

    if (existing.status !== 'active') {
      throw new ConflictError('Subscription is not active')
    }

    return withTransaction(async (client) => {
      const cancelled = await subscriptionRepository.cancel(id, client)

      await auditService.record(
        {
          entityType: 'subscription',
          entityId: id,
          action: 'subscription.cancelled',
          actorUserId: actorUserId ?? null,
          metadata: {},
        },
        client,
      )

      await outboxService.publish(
        {
          eventType: 'SubscriptionCancelled',
          aggregateType: 'subscription',
          aggregateId: id,
          payload: cancelled,
        },
        client,
      )

      return cancelled
    })
  },
}
