/**
 * Registry of the Surfboard API capabilities GainBox is being built to consume.
 * This is metadata for the UI (e.g. the Settings integrations panel) and for
 * developers tracing a feature back to its Surfboard capability — it is not
 * itself an API client. Each entry's `service` points at the GainBox service
 * module responsible for that capability once it is implemented.
 */

export const SURFBOARD_STATUS = {
  PLANNED: 'planned',
  IN_PROGRESS: 'in_progress',
  CONNECTED: 'connected',
}

export const SURFBOARD_CAPABILITIES = [
  {
    key: 'merchant-creation',
    label: 'Merchant Creation',
    description: 'Onboard gyms and meal providers as Surfboard merchants.',
    service: 'merchantService',
    status: SURFBOARD_STATUS.PLANNED,
  },
  {
    key: 'merchant-functions',
    label: 'Merchant Functions',
    description: 'Update merchant profile, contact details, and business branding.',
    service: 'merchantService',
    status: SURFBOARD_STATUS.PLANNED,
  },
  {
    key: 'multi-merchant-group',
    label: 'Multi Merchant Group',
    description: 'Group multiple branches or merchants under one business.',
    service: 'merchantService',
    status: SURFBOARD_STATUS.PLANNED,
  },
  {
    key: 'store-capabilities',
    label: 'Store Capabilities',
    description: 'Create and manage gym branches or meal provider outlets.',
    service: 'storeService',
    status: SURFBOARD_STATUS.PLANNED,
  },
  {
    key: 'device-management',
    label: 'Device Management',
    description: 'Register and assign payment terminals to branches.',
    service: 'deviceService',
    status: SURFBOARD_STATUS.PLANNED,
  },
  {
    key: 'device-handling',
    label: 'Device Handling',
    description: 'Device lifecycle — replace, reassign, and deactivate terminals.',
    service: 'deviceService',
    status: SURFBOARD_STATUS.PLANNED,
  },
  {
    key: 'configure-branding',
    label: 'Configure Branding',
    description: 'Customize payment terminal branding.',
    service: 'deviceService',
    status: SURFBOARD_STATUS.PLANNED,
  },
  {
    key: 'configure-tips',
    label: 'Configure Tips',
    description: 'Enable tipping on meal provider payment terminals.',
    service: 'deviceService',
    status: SURFBOARD_STATUS.PLANNED,
  },
  {
    key: 'make-your-payments',
    label: 'Make Your Payments',
    description: 'Process customer membership and meal plan purchases.',
    service: 'paymentService',
    status: SURFBOARD_STATUS.PLANNED,
  },
  {
    key: 'additional-payment-methods',
    label: 'Additional Payment Methods',
    description: 'Support wallets, QR codes, cards, and NFC.',
    service: 'paymentService',
    status: SURFBOARD_STATUS.PLANNED,
  },
  {
    key: 'additional-operations',
    label: 'Additional Operations',
    description: 'Refunds, delayed capture, and payment cancellations.',
    service: 'paymentService',
    status: SURFBOARD_STATUS.PLANNED,
  },
  {
    key: 'receipts',
    label: 'Receipts',
    description: 'Issue and resend digital payment receipts.',
    service: 'paymentService',
    status: SURFBOARD_STATUS.PLANNED,
  },
  {
    key: 'logistics',
    label: 'Logistics',
    description: 'Order Surfboard payment terminals and accessories.',
    service: 'logisticsService',
    status: SURFBOARD_STATUS.PLANNED,
  },
  {
    key: 'client-auth-token',
    label: 'Client Authentication Token',
    description: 'Secure authentication between the GainBox backend and Surfboard.',
    service: 'authService',
    status: SURFBOARD_STATUS.PLANNED,
  },
]
