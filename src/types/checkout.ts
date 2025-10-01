import type { BaseCustomer, BaseRequest, BaseResponse } from './core';

/**
 * Checkout form data returned by the API
 */
export interface CheckoutFormData {
  checkoutFormContent: string;
  token: string;
  paymentPageUrl?: string;
}

/**
 * Request payload for initializing checkout form
 */
export interface InitializeCheckoutRequest extends BaseRequest, BaseCustomer {
  callbackUrl: string;
  pricingPlanReferenceCode: string;
  subscriptionInitialStatus?: 'PENDING' | 'ACTIVE';
}

/**
 * Response data when initializing checkout form
 */
export interface CheckoutFormResponse extends BaseResponse<CheckoutFormData> {}
