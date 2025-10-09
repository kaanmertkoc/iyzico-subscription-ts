import type { IyzicoOptions, AuthManagerConfig } from './types';

/**
 * User-friendly error messages for common Iyzico error codes
 * These messages are safe to display to end users
 */
export const IYZICO_ERROR_MESSAGES: Record<string, string> = {
  // General Errors (1-27)
  '1': 'System error occurred',
  '2': 'System error occurred',
  '3': 'Email is required',
  '4': 'Email must not exceed 100 characters',
  '5': 'Email format is invalid',
  '8': 'Identity number is required',
  '9': 'Identity number must not exceed 50 characters',
  '10': 'Identity number must be at least 5 characters',
  '11': 'Invalid request',
  '12': 'Card number is invalid',
  '13': 'Expiry month is invalid',
  '14': 'Expiry year is invalid',
  '15': 'CVC is invalid',
  '16': 'Card holder name is required',
  '19': 'Card holder name must not exceed 100 characters',
  '20': 'Conversation ID must not exceed 255 characters',
  '21': 'Card alias must not exceed 293 characters',
  '22': 'IP must not exceed 50 characters',
  '23': 'Callback URL is required',
  '25': 'GSM number is required',
  '26': 'GSM number must not exceed 25 characters',
  '27': 'Invalid phone number format',

  // Authentication Errors (1000-1009)
  '1000': 'Invalid signature - check your API credentials',
  '1001': 'API credentials not found - verify environment (sandbox vs production)',
  '1002': 'Merchant not found - check API key',
  '1003': 'Authorization error - check API and secret key',
  '1004': 'Random string is required in headers',
  '1006': 'API key is required',
  '1007': 'Signature is required',
  '1008': 'Authorization header prefix not found',
  '1009': 'Authorization header string is required',

  // Validation Errors (5000+)
  '5001': 'Payment transaction ID is required',
  '5002': 'Payment ID is required',
  '5111': 'Card user key must be sent with card token',
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
   * Check if this is a business constraint violation (not a real 404)
   * Iyzico returns 404 + errorCode "1" when business rules prevent the operation
   */
  public isBusinessConstraintError(): boolean {
    return this.statusCode === 404 && this.errorCode === '1';
  }

  /**
   * Check if error is a real "not found" error (resource doesn't exist)
   * vs a business constraint violation
   */
  public isNotFoundError(): boolean {
    // Real 404s typically have specific error messages or no errorCode
    // Business constraint 404s have errorCode "1"
    return this.statusCode === 404 && this.errorCode !== '1';
  }

  /**
   * Get operation-specific error message with actionable context
   */
  public getContextualMessage(operation?: string, resourceId?: string): string {
    // Business constraint violation (404 + code "1")
    if (this.isBusinessConstraintError()) {
      if (operation === 'delete' || this.method === 'DELETE') {
        const resource = operation || 'resource';
        return `Cannot delete ${resource}${resourceId ? ` '${resourceId}'` : ''}. This may be due to: active subscriptions using it, plan status restrictions, or other business rules.`;
      }
      return 'Operation failed due to business constraints. Check if the resource is in use or has dependencies.';
    }

    // Real 404 - resource doesn't exist
    if (this.isNotFoundError()) {
      return `Resource not found. Verify the ID is correct.`;
    }

    // Fall back to standard message
    return this.getUserFriendlyMessage();
  }

  /**
   * Get actionable suggestions based on error type and operation
   */
  public getSuggestion(operation?: string): string {
    if (this.isBusinessConstraintError()) {
      if (operation === 'delete' || this.method === 'DELETE') {
        return 'Check for active subscriptions using this plan. You may need to cancel subscriptions or update them to use a different plan before deletion.';
      }
      return 'Verify the resource state and check for dependencies or active usage.';
    }

    if (this.isNotFoundError()) {
      return `Verify the ${operation || 'resource'} ID is correct and the resource exists.`;
    }

    if (this.statusCode === 401 || this.statusCode === 403) {
      return 'Check your API credentials and permissions.';
    }

    if (this.isRetryable()) {
      return 'This error is temporary. Wait a moment and try again.';
    }

    return 'Check the error details and your request parameters.';
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
 * Sandbox limitation error - thrown when trying to use subscription routes in sandbox
 * 
 * @see https://github.com/kaanmertkoc/iyzico-subscription-ts#-sandbox-limitations
 */
export class IyzicoSandboxLimitationError extends IyzicoApiError {
  public override readonly name = 'IyzicoSandboxLimitationError';
  public readonly affectedRoute!: string;

  constructor(path: string, requestId?: string) {
    const responseData: IyzicoApiErrorResponse = {
      status: 'failure',
      errorCode: '100001',
      errorMessage: 'Sistem hatası',
      errorGroup: 'SANDBOX_LIMITATION',
    };

    super(
      `Sandbox environment does not support: ${path}`,
      422,
      responseData,
      requestId,
      { method: 'ANY', url: path }
    );

    // Store the affected route
    Object.defineProperty(this, 'affectedRoute', {
      value: path,
      writable: false,
      enumerable: true,
    });
  }

  /**
   * Returns a user-friendly error message
   */
  public getUserFriendlyMessage(): string {
    return (
      'Iyzico sandbox does not support subscription routes. ' +
      'Please use production credentials for testing subscription features. ' +
      'You can test the health check endpoint (BIN check) in sandbox. ' +
      'Learn more: https://github.com/kaanmertkoc/iyzico-subscription-ts#-sandbox-limitations'
    );
  }

  /**
   * Returns actionable suggestions for resolving the sandbox limitation
   */
  public getSuggestion(): string {
    return (
      'Switch to production credentials to use subscription routes. ' +
      'Set isSandbox: false in your IyzicoClient configuration. ' +
      'Documentation: https://github.com/kaanmertkoc/iyzico-subscription-ts#-sandbox-limitations'
    );
  }

  /**
   * Override category for sandbox errors
   */
  public getCategory(): ErrorCategory {
    return ErrorCategory.CONFIGURATION;
  }

  /**
   * Sandbox errors are not retryable
   */
  public isRetryable(): boolean {
    return false;
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
   * Checks if error is a business constraint violation
   */
  static isBusinessConstraintError(error: unknown): error is IyzicoApiError {
    return error instanceof IyzicoApiError && error.isBusinessConstraintError();
  }

  /**
   * Checks if error is a real "not found" error
   */
  static isNotFoundError(error: unknown): error is IyzicoApiError {
    return error instanceof IyzicoApiError && error.isNotFoundError();
  }

  /**
   * Gets contextual error message with operation context
   */
  static getContextualMessage(error: unknown, operation?: string, resourceId?: string): string {
    if (error instanceof IyzicoApiError) {
      return error.getContextualMessage(operation, resourceId);
    }
    return IyzicoErrorUtils.getUserFriendlyMessage(error);
  }

  /**
   * Gets actionable suggestion for any error
   */
  static getSuggestion(error: unknown, operation?: string): string {
    if (error instanceof IyzicoApiError) {
      return error.getSuggestion(operation);
    }
    return 'An unexpected error occurred. Please try again later.';
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
      if (
        'responseData' in errorData &&
        typeof errorData.responseData === 'object'
      ) {
        const responseData = errorData.responseData as Record<string, unknown>;
        const sanitized = { ...responseData };
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

/**
 * Helper function to detect if an error is due to sandbox limitations
 * 
 * Iyzico returns 422 with error code "100001" ("Sistem hatası") when trying to
 * access subscription routes in sandbox environment.
 * 
 * @param error - The error to check
 * @param isSandbox - Whether the client is configured for sandbox
 * @param path - The API path that was called
 * @returns true if this is a sandbox limitation error
 */
export function isSandboxLimitationError(
  error: unknown,
  isSandbox: boolean,
  path?: string
): boolean {
  // Only check if sandbox mode is enabled
  if (!isSandbox) return false;

  if (error instanceof IyzicoApiError) {
    // Iyzico returns 422 with error code 100001 "Sistem hatası" for sandbox requests
    const isSandboxSystemError =
      error.statusCode === 422 && error.errorCode === '100001';

    // Check if this is a subscription-related path
    const errorPath = path || error.url || '';
    const isSubscriptionPath = errorPath.includes('/subscription/');

    return isSandboxSystemError && isSubscriptionPath;
  }

  return false;
}
