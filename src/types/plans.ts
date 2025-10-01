import {
  Status,
  PaymentInterval,
  CurrencyCode,
  BaseRequest,
  BaseResponse,
  SimpleResponse,
  PaginatedData,
} from './core';

/**
 * Payment plan specific payment type
 */
export enum PlanPaymentType {
  RECURRING = 'RECURRING',
}
/**
 * Base payment plan data structure with typed enums
 */
export interface BasePaymentPlanData {
  referenceCode: string;
  createdDate: number;
  name: string;
  price: number;
  paymentInterval: PaymentInterval;
  paymentIntervalCount: number;
  trialPeriodDays: number;
  currencyCode: CurrencyCode;
  productReferenceCode: string;
  planPaymentType: PlanPaymentType;
  status: Status;
  recurrenceCount?: number;
}

/**
 * Payment plan data structure returned by the API
 */
export interface PaymentPlanData {
  referenceCode: string;
  createdDate: number;
  name: string;
  price: number;
  paymentInterval: string;
  paymentIntervalCount: number;
  trialPeriodDays: number;
  currencyCode: string;
  productReferenceCode: string;
  planPaymentType: string;
  status: string;
  recurrenceCount: number;
}

/**
 * Pricing plan data structure
 */
export interface PricingPlan {
  referenceCode: string;
  name: string;
  price: number;
  currencyCode: CurrencyCode;
  paymentInterval: PaymentInterval;
  paymentIntervalCount: number;
  planPaymentType: PlanPaymentType;
  recurrenceCount: number;
  trialPeriodDays: number;
  productReferenceCode: string;
  status: Status;
  createdDate: number;
}

/**
 * Request payload for creating a new payment plan
 */
export interface CreatePaymentPlanRequest extends BaseRequest {
  name: string;
  productReferenceCode: string;
  planPaymentType: PlanPaymentType;
  paymentIntervalCount: number;
  paymentInterval: PaymentInterval;
  currencyCode: CurrencyCode;
  price: number;
  trialPeriodDays?: number;
  recurrenceCount?: number;
}

/**
 * Request payload for updating an existing payment plan
 */
export interface UpdatePaymentPlanRequest extends BaseRequest {
  name: string;
  pricingPlanReferenceCode: string;
  trialPeriodDays?: number;
}

/**
 * Request payload for creating a new pricing plan
 */
export interface CreatePricingPlanRequest extends BaseRequest {}

/**
 * Response data when creating or retrieving a payment plan
 */
export interface PaymentPlanResponse extends BaseResponse<PaymentPlanData> {}

/**
 * Response data when updating a payment plan
 */
export interface UpdatePaymentPlanResponse
  extends BaseResponse<BasePaymentPlanData> {}

/**
 * Response data when deleting a payment plan
 */
export interface DeletePaymentPlanResponse extends SimpleResponse {}

/**
 * Response data when retrieving a single payment plan
 */
export interface GetPaymentPlanResponse
  extends BaseResponse<BasePaymentPlanData> {}

/**
 * Response data when listing payment plans with pagination
 */
export interface ListPaymentPlansResponse
  extends BaseResponse<PaginatedData<BasePaymentPlanData>> {}
