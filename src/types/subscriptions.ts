// packages/iyzico-sdk-ts/src/types/subscriptions.ts

import { BaseResponse } from './core';

/**
 * Subscription data returned by the API
 */
export interface SubscriptionData {
  referenceCode: string;
  subscriptionReferenceCode?: string;
  status: string;
  // Add other common subscription fields as needed
}

/**
 * Request payload for upgrading a subscription
 */
export interface UpgradeSubscriptionRequest {
  resetRecurrenceCount: boolean;
  useTrial?: boolean;
  upgradePeriod: string;
  newPricingPlanReferenceCode: string;
}

/**
 * Generic subscription response structure
 */
export interface SubscriptionResponse extends BaseResponse<SubscriptionData> {}
