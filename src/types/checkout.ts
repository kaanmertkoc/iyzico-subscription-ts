import type { Address, BaseRequest, BaseResponse } from './core';

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
export interface InitializeCheckoutRequest extends BaseRequest {
  callbackUrl: string;
  shippingAddress: Address;
  billingAddress: Address;
  identityNumber: string;
  gsmNumber: string;
  email: string;
  surname: string;
  name: string;
  subscriptionInitialStatus?: 'PENDING' | 'ACTIVE';
  pricingPlanReferenceCode: string;
}

/**
 * Response data when initializing checkout form
 */
export interface CheckoutFormResponse extends BaseResponse<CheckoutFormData> {}
