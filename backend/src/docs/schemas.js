/**
 * Reusable OpenAPI components — schemas and security schemes referenced via
 * $ref from every route's JSDoc. Adding a new domain schema here (and
 * exporting it) makes it available to any future module's route
 * annotations without touching swagger.js.
 */
export const components = {
  securitySchemes: {
    bearerAuth: {
      type: 'http',
      scheme: 'bearer',
      bearerFormat: 'JWT',
      description:
        'Firebase ID token, sent as "Authorization: Bearer <token>". Verification is not implemented yet — see modules/auth/identityProvider.port.js — so every authenticated request currently fails with either 401 (no token) or 501 (token present, verification unimplemented).',
    },
  },
  schemas: {
    ApiResponse: {
      type: 'object',
      description: 'Standard success envelope every endpoint returns.',
      properties: {
        success: { type: 'boolean', example: true },
        message: { type: 'string', example: 'Success' },
        data: { nullable: true },
        meta: { $ref: '#/components/schemas/Pagination' },
      },
    },
    ErrorResponse: {
      type: 'object',
      description: 'Standard error envelope every failed request returns.',
      properties: {
        success: { type: 'boolean', example: false },
        message: { type: 'string', example: 'Something went wrong' },
      },
    },
    ValidationError: {
      description: 'Returned when request body/query/params fail Zod validation (HTTP 422).',
      allOf: [
        { $ref: '#/components/schemas/ErrorResponse' },
        {
          type: 'object',
          properties: {
            details: {
              type: 'object',
              additionalProperties: { type: 'array', items: { type: 'string' } },
              example: { businessName: ['Required'] },
            },
          },
        },
      ],
    },
    NotFoundError: {
      description: 'Returned when the requested resource does not exist (HTTP 404).',
      allOf: [
        { $ref: '#/components/schemas/ErrorResponse' },
        {
          type: 'object',
          properties: { message: { type: 'string', example: 'Merchant not found' } },
        },
      ],
    },
    Pagination: {
      type: 'object',
      properties: {
        page: { type: 'integer', example: 1 },
        pageSize: { type: 'integer', example: 20 },
        total: { type: 'integer', example: 42 },
        totalPages: { type: 'integer', example: 3 },
      },
    },
    Merchant: {
      type: 'object',
      properties: {
        id: { type: 'string', format: 'uuid' },
        businessName: { type: 'string', example: 'Iron Forge Fitness' },
        businessType: {
          type: 'string',
          enum: [
            'gym',
            'meal-provider',
            'wellness-center',
            'yoga-studio',
            'physio-clinic',
            'nutrition-center',
            'fitness-chain',
            'other',
          ],
        },
        status: { type: 'string', enum: ['pending', 'active', 'suspended'] },
        contactEmail: { type: 'string', format: 'email', nullable: true },
        contactPhone: { type: 'string', nullable: true },
        createdBy: { type: 'string', format: 'uuid', nullable: true },
        updatedBy: { type: 'string', format: 'uuid', nullable: true },
        createdAt: { type: 'string', format: 'date-time' },
        updatedAt: { type: 'string', format: 'date-time' },
      },
    },
    Branch: {
      type: 'object',
      properties: {
        id: { type: 'string', format: 'uuid' },
        merchantId: { type: 'string', format: 'uuid' },
        name: { type: 'string', example: 'Anna Nagar' },
        address: { type: 'string', nullable: true },
        city: { type: 'string', example: 'Chennai' },
        state: { type: 'string', nullable: true, example: 'Tamil Nadu' },
        country: { type: 'string', nullable: true, example: 'India' },
        postalCode: { type: 'string', nullable: true, example: '600040' },
        status: { type: 'string', enum: ['active', 'inactive'] },
        createdBy: { type: 'string', format: 'uuid', nullable: true },
        updatedBy: { type: 'string', format: 'uuid', nullable: true },
        createdAt: { type: 'string', format: 'date-time' },
        updatedAt: { type: 'string', format: 'date-time' },
      },
    },
    Device: {
      type: 'object',
      properties: {
        id: { type: 'string', format: 'uuid' },
        branchId: { type: 'string', format: 'uuid' },
        label: { type: 'string', example: 'Front Desk Terminal' },
        status: { type: 'string', enum: ['registered', 'active', 'offline', 'deactivated'] },
        brandingConfig: { type: 'object', additionalProperties: true, nullable: true },
        tipConfig: { type: 'object', additionalProperties: true, nullable: true },
        createdBy: { type: 'string', format: 'uuid', nullable: true },
        updatedBy: { type: 'string', format: 'uuid', nullable: true },
        createdAt: { type: 'string', format: 'date-time' },
        updatedAt: { type: 'string', format: 'date-time' },
      },
    },
    MembershipPlan: {
      type: 'object',
      properties: {
        id: { type: 'string', format: 'uuid' },
        merchantId: { type: 'string', format: 'uuid' },
        name: { type: 'string', example: 'Muscle Gain Package' },
        description: { type: 'string', nullable: true },
        price: { type: 'string', example: '2499.00', description: 'Decimal string — never a float, to avoid rounding error.' },
        currency: { type: 'string', example: 'INR' },
        billingCycle: { type: 'string', enum: ['one-time', 'monthly', 'quarterly', 'yearly'] },
        status: { type: 'string', enum: ['active', 'archived'] },
        createdBy: { type: 'string', format: 'uuid', nullable: true },
        updatedBy: { type: 'string', format: 'uuid', nullable: true },
        createdAt: { type: 'string', format: 'date-time' },
        updatedAt: { type: 'string', format: 'date-time' },
      },
    },
    Subscription: {
      type: 'object',
      properties: {
        id: { type: 'string', format: 'uuid' },
        membershipPlanId: { type: 'string', format: 'uuid' },
        customerId: { type: 'string', format: 'uuid' },
        status: { type: 'string', enum: ['active', 'cancelled', 'expired'] },
        startedAt: { type: 'string', format: 'date-time' },
        cancelledAt: { type: 'string', format: 'date-time', nullable: true },
        createdAt: { type: 'string', format: 'date-time' },
        updatedAt: { type: 'string', format: 'date-time' },
      },
    },
  },
}
