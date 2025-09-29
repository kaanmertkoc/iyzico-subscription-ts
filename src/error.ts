import type { IyzicoOptions, AuthManagerConfig } from './types';

/**
 * User-friendly error messages for common Iyzico error codes
 * These messages are safe to display to end users
 */
export const IYZICO_ERROR_MESSAGES: Record<string, string> = {
  // Card/Payment Errors
  INVALID_BIN: 'Invalid card number format',
  INVALID_CARD: 'Invalid card information',
  INSUFFICIENT_FUNDS: 'Insufficient funds',
  EXPIRED_CARD: 'Card has expired',
  INVALID_CVV: 'Invalid security code',
  CARD_NOT_ENROLLED: 'Card not enrolled for online payments',
  AUTHENTICATION_FAILED: 'Authentication failed',
  LIMIT_EXCEEDED: 'Transaction limit exceeded',
  FRAUD_SUSPECTED: 'Transaction declined for security reasons',
  
  // Merchant/Account Errors
  INVALID_MERCHANT: 'Invalid merchant configuration',
  MERCHANT_NOT_ACTIVE: 'Merchant account is not active',
  INSUFFICIENT_MERCHANT_BALANCE: 'Insufficient merchant balance',
  
  // Transaction Errors
  INVALID_TRANSACTION: 'Invalid transaction',
  DUPLICATE_TRANSACTION: 'Duplicate transaction detected',
  TRANSACTION_NOT_FOUND: 'Transaction not found',
  TRANSACTION_ALREADY_APPROVED: 'Transaction already approved',
  TRANSACTION_CANCELLED: 'Transaction was cancelled',
  
  // Subscription-Specific Errors
  SUBSCRIPTION_NOT_FOUND: 'Subscription not found',
  SUBSCRIPTION_ALREADY_CANCELLED: 'Subscription is already cancelled',
  SUBSCRIPTION_ALREADY_ACTIVE: 'Subscription is already active',
  PLAN_NOT_FOUND: 'Subscription plan not found',
  PLAN_NOT_ACTIVE: 'Subscription plan is not active',
  CUSTOMER_NOT_FOUND: 'Customer not found',
  CUSTOMER_ALREADY_EXISTS: 'Customer already exists',
  INVALID_SUBSCRIPTION_STATE: 'Invalid subscription state for this operation',
  BILLING_CYCLE_ERROR: 'Error processing billing cycle',
  PAYMENT_METHOD_REQUIRED: 'Valid payment method required',
  PAYMENT_METHOD_EXPIRED: 'Payment method has expired',
  
  // Product Errors
  PRODUCT_NOT_FOUND: 'Product not found',
  PRODUCT_NOT_ACTIVE: 'Product is not active',
  INVALID_PRODUCT_TYPE: 'Invalid product type',
  
  // Validation Errors
  INVALID_REQUEST: 'Invalid request data',
  MISSING_REQUIRED_FIELD: 'Required field is missing',
  INVALID_FIELD_FORMAT: 'Invalid field format',
  INVALID_AMOUNT: 'Invalid amount specified',
  INVALID_CURRENCY: 'Invalid currency code',
  INVALID_EMAIL: 'Invalid email address',
  INVALID_PHONE: 'Invalid phone number',
  
  // Rate Limiting
  RATE_LIMIT_EXCEEDED: 'Too many requests. Please try again later.',
  
  // Generic fallbacks
  INTERNAL_ERROR: 'An internal error occurred',
  SERVICE_UNAVAILABLE: 'Service temporarily unavailable',
  MAINTENANCE_MODE: 'Service is under maintenance',
};

/**
 * Error severity levels for better error handling
 */
export enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium', 
  HIGH = 'high',
  CRITICAL = 'critical'
}

/**
 * Error categories for better organization
 */
export enum ErrorCategory {
  AUTHENTICATION = 'authentication',
  AUTHORIZATION = 'authorization',
  VALIDATION = 'validation',
  PAYMENT = 'payment',
  SUBSCRIPTION = 'subscription',
  NETWORK = 'network',
  CONFIGURATION = 'configuration',
  RATE_LIMIT = 'rate_limit',
  SERVER = 'server',
  UNKNOWN = 'unknown'
}

/**
 * API error response structure from Iyzico
 */
export interface IyzicoApiErrorResponse {
  status?: string;
  errorMessage?: string;
  message?: string;
  errorCode?: string;
  errorGroup?: string;
  code?: string;
  type?: string;
  [key: string]: unknown;
}

/**
 * Configuration options for the Iyzico client
 */
export interface IyzicoClientOptions extends IyzicoOptions {
  /** Request timeout in milliseconds (default: 30000) */
  timeout?: number;
  /** Maximum number of retry attempts (default: 3) */
  maxRetries?: number;
  /** Enable debug logging (default: false) */
  debug?: boolean;
  /** Use sandbox environment instead of production (default: false) */
  isSandbox?: boolean;
  /** Authentication manager configuration */
  authConfig?: AuthManagerConfig;
  /** User agent string for requests */
  userAgent?: string;
  /** Custom headers to include with all requests */
  defaultHeaders?: Record<string, string>;
}

/**
 * Base error class for all Iyzico SDK errors
 */
export abstract class IyzicoError extends Error {
  public readonly name: string;
  public readonly requestId?: string;

  constructor(message: string, requestId?: string) {
    super(message);
    this.name = this.constructor.name;
    // Use object.defineProperty to properly set readonly property
    Object.defineProperty(this, 'requestId', {
      value: requestId,
      writable: false,
      enumerable: true,
    });

    // Capture stack trace if available
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  /**
   * Returns a JSON representation of the error for debugging
   */
  public toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      message: this.message,
      requestId: this.requestId,
      stack: this.stack,
    };
  }
}

/**
 * A structured error thrown when the Iyzico API returns a non-2xx response.
 * Contains all the context needed for debugging API issues.
 */
export class IyzicoApiError extends IyzicoError {
  public readonly statusCode: number;
  public readonly responseData: IyzicoApiErrorResponse;
  public readonly errorCode?: string;
  public readonly errorGroup?: string;
  public readonly url?: string;
  public readonly method?: string;

  constructor(
    message: string,
    statusCode: number,
    responseData: IyzicoApiErrorResponse,
    requestId?: string,
    options?: {
      url?: string;
      method?: string;
    }
  ) {
    super(message, requestId);
    this.statusCode = statusCode;
    this.responseData = responseData;

    // Use Object.defineProperty for readonly properties
    Object.defineProperty(this, 'url', {
      value: options?.url,
      writable: false,
      enumerable: true,
    });

    Object.defineProperty(this, 'method', {
      value: options?.method,
      writable: false,
      enumerable: true,
    });

    // Extract error details from response data
    if (responseData) {
      Object.defineProperty(this, 'errorCode', {
        value: responseData.errorCode || responseData.code,
        writable: false,
        enumerable: true,
      });

      Object.defineProperty(this, 'errorGroup', {
        value: responseData.errorGroup || responseData.type,
        writable: false,
        enumerable: true,
      });
    }
  }

  /**
   * Returns a formatted error message with additional context
   */
  public getFormattedMessage(): string {
    const parts = [`[${this.statusCode}] ${this.message}`];

    if (this.errorCode) {
      parts.push(`Code: ${this.errorCode}`);
    }

    if (this.errorGroup) {
      parts.push(`Group: ${this.errorGroup}`);
    }

    if (this.requestId) {
      parts.push(`Request ID: ${this.requestId}`);
    }

    return parts.join(' | ');
  }

  /**
   * Returns a user-friendly error message safe for end-users
   */
  public getUserFriendlyMessage(): string {
    // Check for specific error codes first
    if (this.errorCode && IYZICO_ERROR_MESSAGES[this.errorCode]) {
      return IYZICO_ERROR_MESSAGES[this.errorCode];
    }

    // Fallback to generic message based on status code
    if (this.statusCode >= 500) {
      return 'Service temporarily unavailable. Please try again later.';
    } else if (this.statusCode === 429) {
      return 'Too many requests. Please try again in a few moments.';
    } else if (this.statusCode >= 400) {
      return this.message || 'Request could not be processed';
    }

    return 'An unexpected error occurred';
  }

  /**
   * Categorizes the error for better handling
   */
  public getCategory(): ErrorCategory {
    if (this.statusCode === 401 || this.errorCode?.includes('AUTH')) {
      return ErrorCategory.AUTHENTICATION;
    }
    if (this.statusCode === 403) {
      return ErrorCategory.AUTHORIZATION;
    }
    if (this.statusCode === 429) {
      return ErrorCategory.RATE_LIMIT;
    }
    if (this.statusCode >= 400 && this.statusCode < 500) {
      if (this.errorCode?.includes('SUBSCRIPTION') || this.errorCode?.includes('PLAN')) {
        return ErrorCategory.SUBSCRIPTION;
      }
      if (this.errorCode?.includes('PAYMENT') || this.errorCode?.includes('CARD')) {
        return ErrorCategory.PAYMENT;
      }
      return ErrorCategory.VALIDATION;
    }
    if (this.statusCode >= 500) {
      return ErrorCategory.SERVER;
    }
    return ErrorCategory.UNKNOWN;
  }

  /**
   * Determines the severity level of the error
   */
  public getSeverity(): ErrorSeverity {
    if (this.statusCode >= 500) {
      return ErrorSeverity.HIGH;
    }
    if (this.statusCode === 429) {
      return ErrorSeverity.MEDIUM;
    }
    if (this.statusCode === 401 || this.statusCode === 403) {
      return ErrorSeverity.HIGH;
    }
    if (this.errorCode?.includes('FRAUD') || this.errorCode?.includes('SECURITY')) {
      return ErrorSeverity.CRITICAL;
    }
    return ErrorSeverity.LOW;
  }

  /**
   * Check if the error is retryable
   */
  public isRetryable(): boolean {
    // Retry server errors and rate limits
    return this.statusCode >= 500 || this.statusCode === 429;
  }

  /**
   * Check if the error is a client error (4xx)
   */
  public isClientError(): boolean {
    return this.statusCode >= 400 && this.statusCode < 500;
  }

  /**
   * Check if the error is a server error (5xx)
   */
  public isServerError(): boolean {
    return this.statusCode >= 500;
  }

  /**
   * Returns a JSON representation of the error with all details
   */
  public toJSON(): Record<string, unknown> {
    return {
      ...super.toJSON(),
      statusCode: this.statusCode,
      errorCode: this.errorCode,
      errorGroup: this.errorGroup,
      responseData: this.responseData,
      url: this.url,
      method: this.method,
      isRetryable: this.isRetryable(),
      isClientError: this.isClientError(),
      isServerError: this.isServerError(),
      userFriendlyMessage: this.getUserFriendlyMessage(),
      category: this.getCategory(),
      severity: this.getSeverity(),
    };
  }
}

/**
 * Network or timeout related errors
 */
export class IyzicoNetworkError extends IyzicoError {
  public readonly cause?: Error;
  public readonly isTimeout: boolean;

  constructor(message: string, cause?: Error, requestId?: string) {
    super(message, requestId);

    Object.defineProperty(this, 'cause', {
      value: cause,
      writable: false,
      enumerable: true,
    });

    this.isTimeout =
      message.toLowerCase().includes('timeout') || cause?.name === 'AbortError';
  }

  /**
   * Returns a JSON representation of the network error
   */
  public toJSON(): Record<string, unknown> {
    return {
      ...super.toJSON(),
      isTimeout: this.isTimeout,
      cause: this.cause
        ? {
            name: this.cause.name,
            message: this.cause.message,
          }
        : undefined,
    };
  }
}

/**
 * Configuration and validation errors
 */
export class IyzicoConfigError extends IyzicoError {
  public readonly configField?: string;

  constructor(message: string, configField?: string) {
    super(message);

    Object.defineProperty(this, 'configField', {
      value: configField,
      writable: false,
      enumerable: true,
    });
  }

  /**
   * Returns a JSON representation of the config error
   */
  public toJSON(): Record<string, unknown> {
    return {
      ...super.toJSON(),
      configField: this.configField,
    };
  }
}

/**
 * Utility functions for error handling
 */
export class IyzicoErrorUtils {
  /**
   * Checks if an error is a specific type of Iyzico error
   */
  static isIyzicoError(error: unknown): error is IyzicoError {
    return error instanceof IyzicoError;
  }

  /**
   * Checks if an error is an API error
   */
  static isApiError(error: unknown): error is IyzicoApiError {
    return error instanceof IyzicoApiError;
  }

  /**
   * Checks if an error is a network error
   */
  static isNetworkError(error: unknown): error is IyzicoNetworkError {
    return error instanceof IyzicoNetworkError;
  }

  /**
   * Checks if an error is a configuration error
   */
  static isConfigError(error: unknown): error is IyzicoConfigError {
    return error instanceof IyzicoConfigError;
  }

  /**
   * Gets a user-friendly message from any error type
   */
  static getUserFriendlyMessage(error: unknown): string {
    if (error instanceof IyzicoApiError) {
      return error.getUserFriendlyMessage();
    }
    if (error instanceof IyzicoNetworkError) {
      return error.isTimeout
        ? 'Request timed out. Please try again.'
        : 'Network error occurred. Please check your connection and try again.';
    }
    if (error instanceof IyzicoConfigError) {
      return 'Service configuration error. Please contact support.';
    }
    if (error instanceof IyzicoError) {
      return 'An error occurred while processing your request.';
    }
    if (error instanceof Error) {
      return 'An unexpected error occurred. Please try again later.';
    }
    return 'An unknown error occurred.';
  }

  /**
   * Determines if an error should be retried
   */
  static isRetryable(error: unknown): boolean {
    if (error instanceof IyzicoApiError) {
      return error.isRetryable();
    }
    if (error instanceof IyzicoNetworkError) {
      return true; // Network errors are generally retryable
    }
    return false; // Config errors and others are not retryable
  }

  /**
   * Gets the error category for any error
   */
  static getErrorCategory(error: unknown): ErrorCategory {
    if (error instanceof IyzicoApiError) {
      return error.getCategory();
    }
    if (error instanceof IyzicoNetworkError) {
      return ErrorCategory.NETWORK;
    }
    if (error instanceof IyzicoConfigError) {
      return ErrorCategory.CONFIGURATION;
    }
    return ErrorCategory.UNKNOWN;
  }

  /**
   * Gets the error severity for any error
   */
  static getErrorSeverity(error: unknown): ErrorSeverity {
    if (error instanceof IyzicoApiError) {
      return error.getSeverity();
    }
    if (error instanceof IyzicoNetworkError) {
      return error.isTimeout ? ErrorSeverity.MEDIUM : ErrorSeverity.HIGH;
    }
    if (error instanceof IyzicoConfigError) {
      return ErrorSeverity.CRITICAL;
    }
    return ErrorSeverity.MEDIUM;
  }

  /**
   * Formats any error for logging with sensitive data removed
   */
  static formatForLogging(error: unknown): Record<string, unknown> {
    if (error instanceof IyzicoError) {
      const errorData = error.toJSON();
      // Remove sensitive data that shouldn't be logged
      if ('responseData' in errorData && typeof errorData.responseData === 'object') {
        const responseData = errorData.responseData as Record<string, unknown>;
        const sanitized = { ...responseData };
        // Remove potentially sensitive fields
        delete sanitized.authToken;
        delete sanitized.apiKey;
        delete sanitized.secretKey;
        delete sanitized.cardNumber;
        delete sanitized.cvv;
        errorData.responseData = sanitized;
      }
      return errorData;
    }
    if (error instanceof Error) {
      return {
        name: error.name,
        message: error.message,
        stack: error.stack,
      };
    }
    return {
      error: String(error),
      type: typeof error,
    };
  }
}
