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
        'Firebase ID token, sent as "Authorization: Bearer <token>". Verified via Firebase Admin (see modules/auth/identityProvider.port.js), then reconciled to an internal user via Identity Sync — req.user carries the Postgres user, never the raw Firebase identity.',
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
    PlatformDashboardSummary: {
      type: 'object',
      description: 'Platform-wide counts plus a fixed set of small "latest N" operational summaries (Phase 2) for the Platform Control Center dashboard. Every count is a single aggregated SQL scalar, not a per-row scan; every list below is independently bounded (LIMIT 5).',
      properties: {
        merchants: { type: 'integer', example: 42 },
        activeMerchants: { type: 'integer', example: 30 },
        pendingMerchants: { type: 'integer', example: 8, description: 'Count, not a list — see pendingMerchantsList for the list.' },
        suspendedMerchants: { type: 'integer', example: 4, description: 'Count, not a list — see suspendedMerchantsList for the list.' },
        branches: { type: 'integer', example: 120 },
        devices: { type: 'integer', example: 340 },
        membershipPlans: { type: 'integer', example: 95 },
        subscriptions: { type: 'integer', example: 610 },
        platformAdmins: { type: 'integer', example: 3, description: 'Distinct users holding the platform-admin role.' },
        merchantOwners: { type: 'integer', example: 42, description: 'Distinct users holding merchant-owner at any merchant.' },
        merchantStaff: { type: 'integer', example: 85, description: 'Distinct users holding merchant-staff at any merchant.' },
        viewers: { type: 'integer', example: 20, description: 'Distinct users holding viewer at any merchant.' },
        latestMerchants: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string', format: 'uuid' },
              businessName: { type: 'string' },
              status: { type: 'string', enum: ['pending', 'active', 'suspended'] },
              createdAt: { type: 'string', format: 'date-time' },
            },
          },
        },
        latestUsers: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string', format: 'uuid' },
              displayName: { type: 'string', nullable: true },
              email: { type: 'string', format: 'email' },
              status: { type: 'string', enum: ['active', 'invited', 'disabled'] },
              createdAt: { type: 'string', format: 'date-time' },
            },
          },
        },
        latestDevices: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string', format: 'uuid' },
              branchId: { type: 'string', format: 'uuid' },
              label: { type: 'string' },
              status: { type: 'string', enum: ['registered', 'active', 'offline', 'deactivated'] },
              createdAt: { type: 'string', format: 'date-time' },
            },
          },
        },
        latestMembershipPlans: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string', format: 'uuid' },
              merchantId: { type: 'string', format: 'uuid' },
              name: { type: 'string' },
              status: { type: 'string', enum: ['active', 'archived'] },
              createdAt: { type: 'string', format: 'date-time' },
            },
          },
        },
        latestSubscriptions: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string', format: 'uuid' },
              membershipPlanId: { type: 'string', format: 'uuid' },
              status: { type: 'string', enum: ['active', 'cancelled', 'expired'] },
              startedAt: { type: 'string', format: 'date-time' },
              createdAt: { type: 'string', format: 'date-time' },
            },
          },
        },
        pendingMerchantsList: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string', format: 'uuid' },
              businessName: { type: 'string' },
              createdAt: { type: 'string', format: 'date-time' },
            },
          },
        },
        suspendedMerchantsList: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string', format: 'uuid' },
              businessName: { type: 'string' },
              createdAt: { type: 'string', format: 'date-time' },
            },
          },
        },
        newestMerchantStaff: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string', format: 'uuid' },
              userId: { type: 'string', format: 'uuid' },
              displayName: { type: 'string', nullable: true },
              email: { type: 'string', format: 'email' },
              merchantId: { type: 'string', format: 'uuid' },
              businessName: { type: 'string' },
              roleName: { type: 'string' },
              status: { type: 'string', enum: ['active', 'removed'] },
              createdAt: { type: 'string', format: 'date-time' },
            },
          },
        },
        newestPlatformAdmins: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              userId: { type: 'string', format: 'uuid' },
              displayName: { type: 'string', nullable: true },
              email: { type: 'string', format: 'email' },
              createdAt: { type: 'string', format: 'date-time' },
            },
          },
        },
        recentActivity: {
          type: 'array',
          description: 'A lightweight preview of the most recent audit_logs entries — see /platform/audit for the full explorer.',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string', format: 'uuid' },
              entityType: { type: 'string' },
              entityId: { type: 'string', format: 'uuid' },
              action: { type: 'string' },
              actor: {
                type: 'object',
                nullable: true,
                properties: { id: { type: 'string', format: 'uuid' }, displayName: { type: 'string', nullable: true } },
              },
              timestamp: { type: 'string', format: 'date-time' },
            },
          },
        },
      },
    },
    PlatformHealth: {
      type: 'object',
      description: 'Live checks, computed fresh on every call — no monitoring history is stored.',
      properties: {
        api: { type: 'object', properties: { status: { type: 'string', example: 'ok' } } },
        database: {
          type: 'object',
          properties: {
            status: { type: 'string', enum: ['ok', 'error'] },
            responseTimeMs: { type: 'integer' },
            message: { type: 'string', nullable: true },
          },
        },
        firebase: {
          type: 'object',
          properties: {
            status: { type: 'string', enum: ['ok', 'not_configured', 'error'] },
            responseTimeMs: { type: 'integer' },
            message: { type: 'string', nullable: true },
          },
        },
        surfboard: {
          type: 'object',
          description: 'Always not_implemented — surfboard.client.js has no working HTTP client yet.',
          properties: {
            status: { type: 'string', example: 'not_implemented' },
            configured: { type: 'boolean' },
            message: { type: 'string' },
          },
        },
        queue: {
          type: 'object',
          description: 'Placeholder — no queue worker/consumer exists yet.',
          properties: { status: { type: 'string', example: 'not_implemented' }, message: { type: 'string' } },
        },
        storage: {
          type: 'object',
          description: 'Placeholder — no storage service is configured yet.',
          properties: { status: { type: 'string', example: 'not_implemented' }, message: { type: 'string' } },
        },
        uptimeSeconds: { type: 'integer', example: 3600 },
        version: { type: 'string', example: '0.0.0' },
        environment: { type: 'string', example: 'development' },
        responseTimeMs: { type: 'integer', example: 12 },
      },
    },
    PlatformAuditEntry: {
      type: 'object',
      properties: {
        id: { type: 'string', format: 'uuid' },
        timestamp: { type: 'string', format: 'date-time' },
        actor: {
          type: 'object',
          nullable: true,
          properties: {
            id: { type: 'string', format: 'uuid' },
            displayName: { type: 'string', nullable: true },
            email: { type: 'string', format: 'email' },
          },
        },
        entity: {
          type: 'object',
          properties: { type: { type: 'string', example: 'merchant' }, id: { type: 'string', format: 'uuid' } },
        },
        action: { type: 'string', example: 'merchant.created' },
        metadata: { type: 'object', additionalProperties: true, nullable: true },
        before: { type: 'object', nullable: true, description: 'Always null — the current audit write path never captures a pre-change snapshot.' },
        after: { type: 'object', nullable: true, description: 'The same value as metadata.' },
      },
    },
    Incident: {
      type: 'object',
      properties: {
        id: { type: 'string', format: 'uuid' },
        title: { type: 'string' },
        description: { type: 'string', nullable: true },
        severity: { type: 'string', enum: ['low', 'medium', 'high', 'critical'] },
        status: { type: 'string', enum: ['open', 'investigating', 'resolved', 'closed', 'cancelled'] },
        category: { type: 'string', nullable: true },
        merchantId: { type: 'string', format: 'uuid', nullable: true },
        branchId: { type: 'string', format: 'uuid', nullable: true },
        deviceId: { type: 'string', format: 'uuid', nullable: true },
        createdBy: { type: 'string', format: 'uuid', nullable: true },
        assignedTo: { type: 'string', format: 'uuid', nullable: true },
        createdAt: { type: 'string', format: 'date-time' },
        updatedAt: { type: 'string', format: 'date-time' },
      },
    },
    Runbook: {
      type: 'object',
      properties: {
        id: { type: 'string', format: 'uuid' },
        title: { type: 'string' },
        category: { type: 'string', nullable: true },
        description: { type: 'string', nullable: true },
        steps: { type: 'array', items: {}, description: 'Free-form ordered procedure content.' },
        relatedIncidentTypes: { type: 'array', items: { type: 'string' } },
        version: { type: 'integer', example: 1, description: 'Auto-incremented on every update — not client-settable.' },
        active: { type: 'boolean' },
        createdBy: { type: 'string', format: 'uuid', nullable: true },
        updatedBy: { type: 'string', format: 'uuid', nullable: true },
        createdAt: { type: 'string', format: 'date-time' },
        updatedAt: { type: 'string', format: 'date-time' },
      },
    },
    Recommendation: {
      type: 'object',
      description: 'The Incident -> Recommendation -> Runbook link.',
      properties: {
        id: { type: 'string', format: 'uuid' },
        incidentId: { type: 'string', format: 'uuid' },
        runbookId: { type: 'string', format: 'uuid' },
        description: { type: 'string', nullable: true },
        status: { type: 'string', enum: ['suggested', 'applied', 'dismissed'] },
        createdBy: { type: 'string', format: 'uuid', nullable: true },
        createdAt: { type: 'string', format: 'date-time' },
        updatedAt: { type: 'string', format: 'date-time' },
      },
    },
    PlatformMerchantOverviewItem: {
      type: 'object',
      properties: {
        merchant: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            businessName: { type: 'string', example: 'Iron Forge Fitness' },
          },
        },
        status: { type: 'string', enum: ['pending', 'active', 'suspended'] },
        branchCount: { type: 'integer', example: 3 },
        deviceCount: { type: 'integer', example: 12 },
        staffCount: { type: 'integer', example: 5, description: 'Active merchant_staff assignments only.' },
        membershipPlanCount: { type: 'integer', example: 4 },
        createdAt: { type: 'string', format: 'date-time' },
      },
    },
    PlatformMerchantStaffEntry: {
      type: 'object',
      properties: {
        id: { type: 'string', format: 'uuid' },
        userId: { type: 'string', format: 'uuid' },
        displayName: { type: 'string', nullable: true },
        email: { type: 'string', format: 'email' },
        roleName: { type: 'string', example: 'merchant-owner' },
        status: { type: 'string', enum: ['active', 'removed'] },
        createdAt: { type: 'string', format: 'date-time' },
      },
    },
    PlatformMerchantDetails: {
      type: 'object',
      properties: {
        merchant: { $ref: '#/components/schemas/Merchant' },
        branches: { type: 'array', items: { $ref: '#/components/schemas/Branch' } },
        devices: { type: 'array', items: { $ref: '#/components/schemas/Device' } },
        membershipPlans: { type: 'array', items: { $ref: '#/components/schemas/MembershipPlan' } },
        merchantStaff: {
          type: 'array',
          items: { $ref: '#/components/schemas/PlatformMerchantStaffEntry' },
          description: 'Includes historical (removed) assignments, not just currently-active staff.',
        },
      },
    },
    PlatformUserOverviewItem: {
      type: 'object',
      properties: {
        id: { type: 'string', format: 'uuid' },
        displayName: { type: 'string', nullable: true },
        email: { type: 'string', format: 'email' },
        status: { type: 'string', enum: ['active', 'invited', 'disabled'] },
        roles: {
          type: 'array',
          items: { type: 'string' },
          example: ['merchant-owner', 'merchant-staff'],
          description: 'Union of global (user_roles) and active merchant-scoped (merchant_staff) role names.',
        },
        merchantCount: { type: 'integer', example: 2, description: 'Distinct merchants this user is actively staffed at.' },
      },
    },
    PlatformMerchantAssignment: {
      type: 'object',
      properties: {
        merchantId: { type: 'string', format: 'uuid' },
        businessName: { type: 'string', example: 'Iron Forge Fitness' },
        roleName: { type: 'string', example: 'merchant-owner' },
        status: { type: 'string', enum: ['active', 'removed'] },
        createdAt: { type: 'string', format: 'date-time' },
      },
    },
    PlatformUserDetails: {
      type: 'object',
      properties: {
        user: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            firebaseUid: { type: 'string' },
            email: { type: 'string', format: 'email' },
            displayName: { type: 'string', nullable: true },
            status: { type: 'string', enum: ['active', 'invited', 'disabled'] },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
          },
        },
        merchantAssignments: {
          type: 'array',
          items: { $ref: '#/components/schemas/PlatformMerchantAssignment' },
          description: 'Every merchant this user has ever been staffed at, including historical (removed) assignments.',
        },
        roles: { type: 'array', items: { type: 'string' }, example: ['merchant-owner'] },
        permissions: {
          type: 'array',
          items: { type: 'string' },
          example: ['merchant.read', 'merchant.write', 'branch.read'],
          description: 'Union of every permission granted by any of this user\'s assigned roles.',
        },
      },
    },
  },
}
