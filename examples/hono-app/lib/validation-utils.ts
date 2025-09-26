import { zValidator } from '@hono/zod-validator';
import { Context } from 'hono';
import { z } from 'zod';
import {
  CurrencyCode,
  PaymentInterval,
  PlanPaymentType,
} from '@kaanmertkoc/iyzico-ts';

/**
 * Standardized validation error handler
 */
const handleValidationError = (result: any, c: Context) => {
  if (!result.success) {
    const firstError = result.error.issues[0];
    return c.json(
      {
        error: 'Validation Error',
        message: firstError?.message || 'Invalid input',
        field: firstError?.path[0]?.toString(),
        timestamp: Date.now(),
      },
      400
    );
  }
  return undefined;
};

/**
 * Smart validator that infers the correct SDK type
 */
export const validator = <T extends z.ZodType>(
  target: 'query' | 'json' | 'param' | 'header',
  schema: T
) => zValidator(target, schema, handleValidationError);

/**
 * Validation schemas - kept minimal and focused on validation rules only
 * The actual types come from your SDK!
 */
export const Schemas = {
  // Product validation
  CreateProduct: z.object({
    name: z.string().min(1, 'Product name is required'),
    description: z.string().optional(),
    locale: z.string().optional(),
    conversationId: z.string().optional(),
  }),

  UpdateProduct: z.object({
    productReferenceCode: z
      .string()
      .min(1, 'Product reference code is required'),
    name: z.string().min(1, 'Product name is required'),
    description: z.string().optional(),
    locale: z.string().optional(),
    conversationId: z.string().optional(),
  }),

  // Health/BIN validation
  BinCheck: z.object({
    binNumber: z
      .string()
      .min(6, 'BIN must be at least 6 digits')
      .max(8, 'BIN must be at most 8 digits')
      .regex(/^\d{6,8}$/, 'Must be 6-8 digits'),
    locale: z.string().optional(),
    conversationId: z.string().optional(),
  }),

  // Payment Plan validation
  CreatePaymentPlan: z.object({
    name: z.string().min(1, 'Plan name required'),
    productReferenceCode: z.string().min(1, 'Product reference required'),
    recurrenceCount: z.number().optional(),
    planPaymentType: z.nativeEnum(PlanPaymentType),
    trialPeriodDays: z.number().optional(),
    paymentIntervalCount: z.number().positive(),
    paymentInterval: z.nativeEnum(PaymentInterval),
    currencyCode: z.nativeEnum(CurrencyCode),
    price: z.number().positive(),
    locale: z.string().optional(),
    conversationId: z.string().optional(),
  }),

  ListPaymentPlans: z.object({
    productReferenceCode: z.string().min(1, 'Product reference required'),
    page: z.number().optional().default(1),
    count: z.number().optional().default(10),
  }),

  UpdatePaymentPlan: z.object({
    name: z.string().min(1, 'Plan name required'),
    pricingPlanReferenceCode: z.string().min(1, 'Plan reference required'),
    trialPeriodDays: z.number().optional(),
  }),

  // Subscription validation
  UpgradeSubscription: z.object({
    resetRecurrenceCount: z.boolean(),
    useTrial: z.boolean().optional(),
    upgradePeriod: z.string().min(1),
    newPricingPlanReferenceCode: z.string().min(1),
  }),

  // Route params
  Params: {
    id: z.object({ id: z.string().min(1) }),
  },

  // Query params
  Query: {
    bin: z.object({
      bin: z
        .string()
        .min(6, 'BIN must be at least 6 digits')
        .max(8, 'BIN must be at most 8 digits')
        .regex(/^\d{6,8}$/, 'Must be 6-8 digits'),
    }),
  },
};
