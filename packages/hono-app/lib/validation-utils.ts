import { zValidator } from '@hono/zod-validator';
import { Context } from 'hono';
import { z } from 'zod';
import {
  CurrencyCode,
  PaymentInterval,
  PlanPaymentType,
} from '@kaanmertkoc/iyzico-ts';

// Re-export types for use in route files
export type {
  CreateProductRequest,
  BinCheckRequest,
  CreatePaymentPlanRequest,
  UpgradeSubscriptionRequest,
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
 * Clean validator creator with consistent error handling
 */
export const validator = <T extends z.ZodType>(
  target: 'query' | 'json' | 'param' | 'header',
  schema: T
) => zValidator(target, schema, handleValidationError);

// Zod schemas based on your exact SDK types
export const CreateProductRequestSchema = z.object({
  name: z.string().min(1, 'Product name is required'),
  description: z.string().optional(),
  locale: z.string().optional(),
  conversationId: z.string().optional(),
});

export const BinCheckRequestSchema = z.object({
  binNumber: z
    .string()
    .length(6, 'BIN must be 6 digits')
    .regex(/^\d{6}$/, 'BIN must contain only digits'),
  locale: z.string().optional(),
  conversationId: z.string().optional(),
});

export const CreatePaymentPlanRequestSchema = z.object({
  name: z.string().min(1, 'Plan name is required'),
  productReferenceCode: z.string().min(1, 'Product reference code is required'),
  recurrenceCount: z.number().optional(),
  planPaymentType: z.nativeEnum(PlanPaymentType),
  trialPeriodDays: z.number().optional(),
  paymentIntervalCount: z
    .number()
    .positive('Payment interval count must be positive'),
  paymentInterval: z.nativeEnum(PaymentInterval),
  currencyCode: z.nativeEnum(CurrencyCode),
  price: z.number().positive('Price must be positive'),
  locale: z.string().optional(),
  conversationId: z.string().optional(),
});

export const UpgradeSubscriptionRequestSchema = z.object({
  resetRecurrenceCount: z.boolean(),
  useTrial: z.boolean().optional(),
  upgradePeriod: z.string().min(1, 'Upgrade period is required'),
  newPricingPlanReferenceCode: z
    .string()
    .min(1, 'New pricing plan reference code is required'),
});

// Query parameter schemas for routes
export const BinCheckQuerySchema = z.object({
  bin: z
    .string()
    .length(6)
    .regex(/^\d{6}$/),
});

export const ProductParamsSchema = z.object({
  id: z.string().min(1),
});

export const PlanParamsSchema = z.object({
  id: z.string().min(1),
});

export const SubscriptionParamsSchema = z.object({
  id: z.string().min(1),
});
