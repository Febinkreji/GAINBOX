import { analyticsRepository } from './analytics.repository.js'

export const analyticsService = {
  async getRevenueSummary(merchantId, dateRange) {
    return analyticsRepository.getRevenueSummary(merchantId, dateRange)
  },

  async getBranchPerformance(merchantId, dateRange) {
    return analyticsRepository.getBranchPerformance(merchantId, dateRange)
  },

  async getMembershipTrends(merchantId, dateRange) {
    return analyticsRepository.getMembershipTrends(merchantId, dateRange)
  },
}
