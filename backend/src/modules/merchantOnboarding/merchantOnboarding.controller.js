import { asyncHandler } from '../../utils/asyncHandler.js'
import { ApiResponse } from '../../utils/ApiResponse.js'
import { merchantOnboardingService } from './merchantOnboarding.service.js'

export const merchantOnboardingController = {
  onboard: asyncHandler(async (req, res) => {
    const result = await merchantOnboardingService.onboard(req.body, req.user?.id)
    ApiResponse.send(res, { statusCode: 201, data: result, message: 'Merchant onboarded' })
  }),
}
