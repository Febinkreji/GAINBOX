import { asyncHandler } from '../../utils/asyncHandler.js'
import { ApiResponse } from '../../utils/ApiResponse.js'
import { merchantService } from './merchant.service.js'

// getById/update serve two route families with the same underlying logic:
// the legacy /merchants/:id (merchantId from an ownership-checked URL
// param) and the new /merchant/profile (merchantId derived from the
// authenticated user via requireMerchantContext() — see
// authorization.middleware.js). Resolving whichever is present here is
// what lets both mount points share one controller with zero duplicated
// logic, rather than forking getById/update into two near-identical copies.
function resolveMerchantId(req) {
  return req.merchantId ?? req.params.id
}

export const merchantController = {
  list: asyncHandler(async (req, res) => {
    const { items, meta } = await merchantService.list(req.query)
    ApiResponse.send(res, { data: items, meta })
  }),

  getById: asyncHandler(async (req, res) => {
    const merchant = await merchantService.getById(resolveMerchantId(req))
    ApiResponse.send(res, { data: merchant })
  }),

  create: asyncHandler(async (req, res) => {
    const merchant = await merchantService.create(req.body, req.user?.id)
    ApiResponse.send(res, { statusCode: 201, data: merchant, message: 'Merchant created' })
  }),

  update: asyncHandler(async (req, res) => {
    const merchant = await merchantService.update(resolveMerchantId(req), req.body, req.user?.id)
    ApiResponse.send(res, { data: merchant, message: 'Merchant updated' })
  }),

  remove: asyncHandler(async (req, res) => {
    await merchantService.remove(resolveMerchantId(req), req.user?.id)
    ApiResponse.send(res, { message: 'Merchant deleted' })
  }),
}
