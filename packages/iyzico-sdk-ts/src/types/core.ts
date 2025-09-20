/**
 * Common status values used across Iyzico entities
 */
export enum Status {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
}

/**
 * Supported payment intervals for recurring payments
 */
export enum PaymentInterval {
  DAILY = 'DAILY',
  WEEKLY = 'WEEKLY',
  MONTHLY = 'MONTHLY',
  YEARLY = 'YEARLY',
}

/**
 * Supported currency codes in the Iyzico system
 */
export enum CurrencyCode {
  TRY = 'TRY',
  USD = 'USD',
  EUR = 'EUR',
}

/**
 * SDK Configuration options for initializing the Iyzico client
 */
export interface IyzicoOptions {
  apiKey: string;
  secretKey: string;
  baseUrl?: string;
}

/**
 * Authentication header generation options
 * @internal
 */
export interface AuthHeaderOptions {
  apiKey: string;
  secretKey: string;
  path: string;
  body: string;
}

/**
 * Base request structure with common optional fields
 */
export interface BaseRequest {
  locale?: string;
  conversationId?: string;
}

/**
 * Standard Iyzico API response wrapper
 * @template T The type of the response data
 */
export interface BaseResponse<T = unknown> {
  status: string;
  systemTime: number;
  data?: T;
}

/**
 * Response structure for operations that don't return data
 */
export interface SimpleResponse {
  status: string;
  systemTime: number;
}

/**
 * Paginated response data structure
 * @template T The type of items in the pagination
 */
export interface PaginatedData<T = unknown> {
  totalCount: number;
  currentPage: number;
  pageCount: number;
  items: T[];
}

/**
 * Standard address format used across Iyzico API
 */
export interface Address {
  contactName: string;
  country: string;
  city: string;
  zipCode?: string;
  address: string;
}
