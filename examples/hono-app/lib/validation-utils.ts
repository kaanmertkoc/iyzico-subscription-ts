import { zValidator } from '@hono/zod-validator';
import { Context } from 'hono';
import { z } from 'zod';
import {
  CurrencyCode,
  PaymentInterval,
  PlanPaymentType,
} from '@kaanmertkoc/iyzico-subs-ts';

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
 * Reusable schema components
 */
const BaseSchemas = {
  address: z.object({
    contactName: z.string().min(1, 'Contact name required'),
    country: z.string().min(1, 'Country required'),
    city: z.string().min(1, 'City required'),
    address: z.string().min(1, 'Address required'),
    zipCode: z.string().optional(),
  }),

  baseRequest: z.object({
    locale: z.string().optional(),
    conversationId: z.string().optional(),
  }),

  binNumber: z
    .string()
    .min(6, 'BIN must be at least 6 digits')
    .max(8, 'BIN must be at most 8 digits')
    .regex(/^\d{6,8}$/, 'Must be 6-8 digits'),
};

/**
 * Validation schemas - kept minimal and focused on validation rules only
 * The actual types come from your SDK!
 */
export const Schemas = {
  // Product validation
  CreateProduct: BaseSchemas.baseRequest.extend({
    name: z.string().min(1, 'Product name is required'),
    description: z.string().optional(),
  }),

  UpdateProduct: BaseSchemas.baseRequest.extend({
    productReferenceCode: z
      .string()
      .min(1, 'Product reference code is required'),
    name: z.string().min(1, 'Product name is required'),
    description: z.string().optional(),
  }),

  // Health/BIN validation
  BinCheck: BaseSchemas.baseRequest.extend({
    binNumber: BaseSchemas.binNumber,
  }),

  // Payment Plan validation
  CreatePaymentPlan: BaseSchemas.baseRequest.extend({
    name: z.string().min(1, 'Plan name required'),
    productReferenceCode: z.string().min(1, 'Product reference required'),
    recurrenceCount: z.number().optional(),
    planPaymentType: z.nativeEnum(PlanPaymentType),
    trialPeriodDays: z.number().optional(),
    paymentIntervalCount: z.number().positive(),
    paymentInterval: z.nativeEnum(PaymentInterval),
    currencyCode: z.nativeEnum(CurrencyCode),
    price: z.number().positive(),
  }),

  ListPaymentPlans: z.object({
    productReferenceCode: z.string().min(1, 'Product reference required'),
    page: z.coerce
      .number()
      .int()
      .min(1, 'Page must be at least 1')
      .optional()
      .default(1),
    count: z.coerce
      .number()
      .int()
      .min(1, 'Count must be at least 1')
      .max(100, 'Count cannot exceed 100')
      .optional()
      .default(10),
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
    token: z.object({ token: z.string().min(1) }),
  },

  // Checkout validation (matches API structure with customer object)
  InitializeCheckout: BaseSchemas.baseRequest.extend({
    pricingPlanReferenceCode: z.string().min(1, 'Plan reference required'),
    callbackUrl: z.string().url(),
    subscriptionInitialStatus: z.enum(['PENDING', 'ACTIVE']).optional(),
    name: z.string().min(1, 'Customer name required'),
    surname: z.string().min(1, 'Customer surname required'),
    email: z.string().email().min(1, 'Customer email required'),
    gsmNumber: z
      .string()
      .min(1, 'GSM number is required')
      .regex(/^\+?[0-9]{10,15}$/, 'Invalid phone number format (use +90XXXXXXXXXX or 05XXXXXXXXX)'),
    identityNumber: z
      .string()
      .min(11, 'Identity number must be 11 digits')
      .max(11, 'Identity number must be 11 digits')
      .regex(/^[0-9]{11}$/, 'Identity number must be 11 digits'),
    billingAddress: BaseSchemas.address.optional(),
    shippingAddress: BaseSchemas.address.optional(),
  }),

  // NON-3DS Subscription validation (matches API structure with customer object)
  InitializeSubscription: BaseSchemas.baseRequest.extend({
    pricingPlanReferenceCode: z.string().min(1, 'Plan reference required'),
    subscriptionInitialStatus: z.enum(['PENDING', 'ACTIVE']).optional(),
    name: z.string().min(1, 'Customer name required'),
    surname: z.string().min(1, 'Customer surname required'),
    email: z.string().email().min(1, 'Customer email required'),
    gsmNumber: z
      .string()
      .min(1, 'GSM number is required')
      .regex(/^\+?[0-9]{10,15}$/, 'Invalid phone number format (use +90XXXXXXXXXX or 05XXXXXXXXX)'),
    identityNumber: z
      .string()
      .min(11, 'Identity number must be 11 digits')
      .max(11, 'Identity number must be 11 digits')
      .regex(/^[0-9]{11}$/, 'Identity number must be 11 digits'),
    billingAddress: BaseSchemas.address.optional(),
    shippingAddress: BaseSchemas.address.optional(),
    paymentCard: z.object({
      cardHolderName: z.string().optional(),
      cardNumber: z.string().optional(),
      expireYear: z.string().optional(),
      expireMonth: z.string().optional(),
      cvc: z.string().optional(),
      registerConsumerCard: z.boolean().optional(),
      cardToken: z.string().optional(),
      consumerToken: z.string().optional(),
      ucsToken: z.string().optional(),
    }),
  }),

  // Card Update validation (requires either subscriptionReferenceCode or customerReferenceCode)
  CardUpdate: BaseSchemas.baseRequest
    .extend({
      callbackUrl: z.string().url(),
      subscriptionReferenceCode: z.string().optional(),
      customerReferenceCode: z.string().optional(),
    })
    .refine(
      (data) => data.subscriptionReferenceCode || data.customerReferenceCode,
      {
        message:
          'Either subscriptionReferenceCode or customerReferenceCode is required',
      }
    ),

  // Query params
  Query: {
    bin: z.object({
      bin: BaseSchemas.binNumber,
    }),
  },
};
