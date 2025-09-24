// packages/iyzico-sdk-ts/src/index.ts

// Export the main client and error classes
export {
  IyzicoClient,
  IyzicoError,
  IyzicoApiError,
  IyzicoNetworkError,
  IyzicoConfigError,
  type IyzicoClientOptions,
} from './client';

// Export all types
export * from './types';

// Export individual services for advanced usage
export { ProductsService } from './services/products';
export { PlansService } from './services/plans';
export { CheckoutService } from './services/checkout';
export { SubscriptionsService } from './services/subscriptions';
export { HealthService } from './services/health';

// Export auth utility (for advanced users who might want to use it directly)
export { generateAuthHeaders } from './auth';
