import { notImplemented } from '../../utils/notImplemented.js'

/**
 * Analytics has no aggregate root of its own — it's a read-side query
 * service over Branch/Payment/Membership data, so it doesn't extend
 * BaseRepository (that contract is CRUD-shaped; this one is reporting-shaped).
 */
export class AnalyticsRepository {
  async getRevenueSummary(_merchantId, _dateRange) {
    notImplemented('AnalyticsRepository.getRevenueSummary')
  }

  async getBranchPerformance(_merchantId, _dateRange) {
    notImplemented('AnalyticsRepository.getBranchPerformance')
  }

  async getMembershipTrends(_merchantId, _dateRange) {
    notImplemented('AnalyticsRepository.getMembershipTrends')
  }
}

export const analyticsRepository = new AnalyticsRepository()
