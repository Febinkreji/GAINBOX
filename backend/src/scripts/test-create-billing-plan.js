import { surfboardBillingAdapter } from '../modules/integrations/surfboard/index.js'
import { logger } from '../logger/logger.js'

/**
 * One-time manual verification that GainBox can call Surfboard's Create
 * Billing Plans endpoint (`POST /partners/{partnerId}/billing-plans`)
 * independently of Merchant Creation — mirroring the order GameForge is
 * reported to have used (billing plan first, merchant second). This is a
 * standalone script, not wired into any route/worker — run it manually (see
 * the command in the PR/task notes), never imported elsewhere.
 *
 * Does NOT touch Merchant Creation in any way.
 */
async function main() {
  // Matches the confirmed Create Billing Plans request example exactly —
  // swap the `id` for a real, partner-unique plan id before running against
  // anything but the Demo environment (the docs require uniqueness per
  // partner, so re-running with the same id will surface as a Surfboard
  // 400/ERROR, not a bug in this script).
  const plans = [
    {
      id: 'GAINBOX_TEST_PLAN_1',
      paymentMethod: 'CARD',
      cardBrand: 'VISA',
      terminalType: 'STANDARD',
      planType: 'FIXED',
      description: 'GainBox billing plan verification script',
      fixedPercentage: 1.5,
    },
  ]

  const result = await surfboardBillingAdapter.createBillingPlans(plans)

  logger.info({ result }, 'Surfboard Create Billing Plans call completed')
  console.log(JSON.stringify(result, null, 2))
}

main().catch((error) => {
  logger.error({ error }, 'Surfboard Create Billing Plans call failed')
  console.error(error)
  process.exitCode = 1
})
