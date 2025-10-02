import type { BaseCustomer, BaseRequest, BaseResponse } from './core';

/**
 * Checkout form data returned by the API
 */
export interface CheckoutFormData {
  checkoutFormContent: string;
  token: string;
  tokenExpireTime: number;
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
 * Payment card information for NON-3DS subscription
 */
export interface PaymentCard {
  cardHolderName?: string;
  cardNumber?: string;
  expireYear?: string;
  expireMonth?: string;
  cvc?: string;
  registerConsumerCard?: boolean;
  cardToken?: string;
  consumerToken?: string;
  ucsToken?: string;
}

/**
 * Request payload for initializing subscription via NON-3DS
 */
export interface InitializeSubscriptionRequest
  extends BaseRequest,
    BaseCustomer {
  pricingPlanReferenceCode: string;
  subscriptionInitialStatus?: 'PENDING' | 'ACTIVE';
  paymentCard: PaymentCard;
}

/**
 * Subscription data returned from initialization
 */
export interface SubscriptionInitData {
  referenceCode: string;
  parentReferenceCode: string;
  pricingPlanReferenceCode: string;
  customerReferenceCode: string;
  subscriptionStatus: string;
  trialDays?: number;
  trialStartDate?: number;
  trialEndDate?: number;
  createdDate: number;
  startDate: number;
  endDate?: number;
}

/**
 * Request payload for card update
 */
export interface CardUpdateRequest extends BaseRequest {
  callbackUrl: string;
  subscriptionReferenceCode: string;
}

/**
 * Response data when initializing checkout form
 */
export interface CheckoutFormResponse extends BaseResponse<CheckoutFormData> {
  checkoutFormContent?: string;
  token?: string;
  tokenExpireTime?: number;
}

/**
 * Response data when initializing subscription
 */
export interface InitializeSubscriptionResponse
  extends BaseResponse<SubscriptionInitData> {}
