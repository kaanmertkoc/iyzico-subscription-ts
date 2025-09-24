// packages/iyzico-sdk-ts/src/client.ts
import { generateAuthHeaders } from './auth';
import type { IyzicoOptions } from './types';
import { ProductsService } from './services/products';
import { PlansService } from './services/plans';
import { CheckoutService } from './services/checkout';
import { SubscriptionsService } from './services/subscriptions';
import { HealthService } from './services/health';

export const IYZICO_BASE_URL = 'https://api.iyzipay.com';
export const IYZICO_SANDBOX_BASE_URL = 'https://sandbox-merchant.iyzipay.com';

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
    (this as any).requestId = requestId;

    // Capture stack trace if available
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  /**
   * Returns a JSON representation of the error for debugging
   */
  public toJSON(): Record<string, any> {
    return {
      name: this.name,
      message: this.message,
      requestId: this.requestId,
      stack: this.stack
    };
  }
}

/**
 * A structured error thrown when the Iyzico API returns a non-2xx response.
 * Contains all the context needed for debugging API issues.
 */
export class IyzicoApiError extends IyzicoError {
  public readonly statusCode: number;
  public readonly responseData: any;
  public readonly errorCode?: string;
  public readonly errorGroup?: string;
  public readonly url?: string;
  public readonly method?: string;

  constructor(
    message: string,
    statusCode: number,
    responseData: any,
    requestId?: string,
    options?: {
      url?: string;
      method?: string;
    }
  ) {
    super(message, requestId);
    this.statusCode = statusCode;
    this.responseData = responseData;
    (this as any).url = options?.url;
    (this as any).method = options?.method;

    // Extract error details from response data
    if (responseData) {
      (this as any).errorCode = responseData.errorCode || responseData.code;
      (this as any).errorGroup = responseData.errorGroup || responseData.type;
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
   * Returns details that can be safely shown to end users
   */
  public getUserFriendlyMessage(): string {
    // Map common error codes to user-friendly messages
    const userFriendlyMessages: Record<string, string> = {
      INVALID_BIN: 'Invalid card number format',
      INVALID_CARD: 'Invalid card information',
      INSUFFICIENT_FUNDS: 'Insufficient funds',
      EXPIRED_CARD: 'Card has expired',
      INVALID_CVV: 'Invalid security code',
      CARD_NOT_ENROLLED: 'Card not enrolled for online payments',
      AUTHENTICATION_FAILED: 'Authentication failed',
      LIMIT_EXCEEDED: 'Transaction limit exceeded',
      FRAUD_SUSPECTED: 'Transaction declined for security reasons',
      INVALID_MERCHANT: 'Invalid merchant configuration',
      INVALID_TRANSACTION: 'Invalid transaction',
      DUPLICATE_TRANSACTION: 'Duplicate transaction detected',
    };

    if (this.errorCode && userFriendlyMessages[this.errorCode]) {
      return userFriendlyMessages[this.errorCode];
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
  public toJSON(): Record<string, any> {
    return {
      ...super.toJSON(),
      statusCode: this.statusCode,
      errorCode: this.errorCode,
      errorGroup: this.errorGroup,
      responseData: this.responseData,
      url: this.url,
      method: this.method,
      userFriendlyMessage: this.getUserFriendlyMessage(),
      isRetryable: this.isRetryable(),
      isClientError: this.isClientError(),
      isServerError: this.isServerError(),
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
    (this as any).cause = cause;
    this.isTimeout =
      message.toLowerCase().includes('timeout') || cause?.name === 'AbortError';
  }

  /**
   * Returns a JSON representation of the network error
   */
  public toJSON(): Record<string, any> {
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
    (this as any).configField = configField;
  }

  /**
   * Returns a JSON representation of the config error
   */
  public toJSON(): Record<string, any> {
    return {
      ...super.toJSON(),
      configField: this.configField,
    };
  }
}

/**
 * The main client for interacting with the Iyzico v2 Subscription API.
 *
 * @example
 * ```typescript
 * // Production client
 * const iyzico = new IyzicoClient({
 *   apiKey: 'your-live-api-key',
 *   secretKey: 'your-live-secret-key',
 *   isSandbox: false, // Use production environment
 *   debug: true, // Enable logging
 *   timeout: 10000 // 10 second timeout
 * });
 *
 * // Sandbox client for testing
 * const sandboxIyzico = new IyzicoClient({
 *   apiKey: 'your-sandbox-api-key',
 *   secretKey: 'your-sandbox-secret-key',
 *   isSandbox: true, // Use sandbox environment
 *   debug: true
 * });
 *
 * const product = await iyzico.products.create({
 *   name: 'My Product',
 *   description: 'Product description'
 * });
 * ```
 */
export class IyzicoClient {
  private readonly options: Required<
    Omit<IyzicoClientOptions, 'sandboxApiKey' | 'sandboxSecretKey'>
  > & {
    sandboxApiKey?: string;
    sandboxSecretKey?: string;
  };

  /** Service for managing products */
  public readonly products: ProductsService;

  /** Service for managing payment plans */
  public readonly plans: PlansService;

  /** Service for managing checkout forms */
  public readonly checkout: CheckoutService;

  /** Service for managing subscriptions */
  public readonly subscriptions: SubscriptionsService;

  /** Service for health checks and utilities */
  public readonly health: HealthService;

  constructor(options: IyzicoClientOptions) {
    // Validate required options
    if (!options.apiKey?.trim()) {
      throw new IyzicoConfigError(
        'Iyzico API Key is required and cannot be empty.',
        'apiKey'
      );
    }

    if (!options.secretKey?.trim()) {
      throw new IyzicoConfigError(
        'Iyzico Secret Key is required and cannot be empty.',
        'secretKey'
      );
    }

    // Validate sandbox keys only if sandbox mode is enabled
    if (options.isSandbox) {
      if (!options.sandboxApiKey?.trim()) {
        throw new IyzicoConfigError(
          'Iyzico Sandbox API Key is required when isSandbox is enabled.',
          'sandboxApiKey'
        );
      }

      if (!options.sandboxSecretKey?.trim()) {
        throw new IyzicoConfigError(
          'Iyzico Sandbox Secret Key is required when isSandbox is enabled.',
          'sandboxSecretKey'
        );
      }
    }

    // Determine the appropriate base URL based on environment
    const defaultBaseUrl = options.isSandbox
      ? IYZICO_SANDBOX_BASE_URL // Sandbox environment
      : IYZICO_BASE_URL; // Production environment

    // Set defaults and validate options
    this.options = {
      baseUrl: defaultBaseUrl,
      timeout: 30000, // 30 seconds
      maxRetries: 3,
      debug: false,
      isSandbox: options.isSandbox || false,
      ...options,
    };

    // Validate baseUrl format
    try {
      new URL(this.options.baseUrl);
    } catch {
      throw new IyzicoConfigError(
        'Invalid baseUrl provided. Must be a valid URL.',
        'baseUrl'
      );
    }

    // Validate numeric options
    if (this.options.timeout < 1000) {
      throw new IyzicoConfigError(
        'Timeout must be at least 1000ms (1 second).',
        'timeout'
      );
    }

    if (this.options.maxRetries < 0 || this.options.maxRetries > 10) {
      throw new IyzicoConfigError(
        'maxRetries must be between 0 and 10.',
        'maxRetries'
      );
    }

    // Log initialization if debug is enabled
    if (this.options.debug) {
      console.log('[IyzicoClient] Initialized with options:', {
        baseUrl: this.options.baseUrl,
        timeout: this.options.timeout,
        maxRetries: this.options.maxRetries,
        isSandbox: this.options.isSandbox,
        environment: this.options.isSandbox ? 'sandbox' : 'production',
        apiKey: `${this.options.apiKey.substring(0, 8)}...`,
      });
    }

    // Instantiate all resource services
    this.products = new ProductsService(this);
    this.plans = new PlansService(this);
    this.checkout = new CheckoutService(this);
    this.subscriptions = new SubscriptionsService(this);
    this.health = new HealthService(this);
  }

  /**
   * The core request method used by all services.
   * @internal
   */
  public async request<T>(requestConfig: {
    path: string;
    method: string;
    body?: object;
    retryCount?: number;
  }): Promise<T> {
    const { path, method, body, retryCount = 0 } = requestConfig;
    const url = `${this.options.baseUrl}${path}`;
    const requestBodyString = body ? JSON.stringify(body) : '';
    const requestId = `req_${Date.now()}_${Math.random()
      .toString(36)
      .slice(2, 11)}`;

    // Runtime safety check for sandbox credentials
    if (
      this.options.isSandbox &&
      (!this.options.sandboxApiKey || !this.options.sandboxSecretKey)
    ) {
      throw new IyzicoConfigError(
        'Sandbox mode is enabled but sandbox credentials are missing. Provide sandboxApiKey and sandboxSecretKey.',
        'sandboxCredentials'
      );
    }

    // Generate authentication headers
    const headers = generateAuthHeaders({
      apiKey: this.options.isSandbox
        ? this.options.sandboxApiKey!
        : this.options.apiKey,
      secretKey: this.options.isSandbox
        ? this.options.sandboxSecretKey!
        : this.options.secretKey,
      path,
      body: requestBodyString,
    });

    // Add request ID for tracking (create proper headers object)
    const requestHeaders: Record<string, string> = {
      ...(headers as Record<string, string>),
      'X-Request-ID': requestId,
    };

    if (this.options.debug) {
      console.log(`[IyzicoClient] ${method} ${url}`, {
        requestId,
        headers: { ...requestHeaders, Authorization: '[REDACTED]' },
        body: body || null,
      });
    }

    try {
      // Create AbortController for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(
        () => controller.abort(),
        this.options.timeout
      );

      // Prepare request body - ensure proper typing
      const requestBody: string | null =
        method !== 'GET' && method !== 'DELETE' && requestBodyString
          ? requestBodyString
          : null;

      const response = await fetch(url, {
        method,
        headers: requestHeaders,
        body: requestBody,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      // Parse response
      let responseData: any;
      const contentType = response.headers.get('content-type');

      if (contentType?.includes('application/json')) {
        responseData = await response.json();
      } else {
        const textData = await response.text();
        if (this.options.debug) {
          console.warn(`[IyzicoClient] Non-JSON response received:`, textData);
        }
        responseData = { rawResponse: textData };
      }

      if (this.options.debug) {
        console.log(`[IyzicoClient] Response ${response.status}:`, {
          requestId,
          status: response.status,
          data: responseData,
        });
      }

      // Handle non-2xx responses
      if (!response.ok) {
        // Check if we should retry
        if (this.shouldRetry(response.status, retryCount)) {
          if (this.options.debug) {
            console.log(
              `[IyzicoClient] Retrying request (attempt ${retryCount + 1}/${
                this.options.maxRetries
              })`
            );
          }

          // Wait before retry (exponential backoff)
          await this.delay(Math.min(1000 * Math.pow(2, retryCount), 10000));

          return this.request<T>({
            ...requestConfig,
            retryCount: retryCount + 1,
          });
        }

        throw new IyzicoApiError(
          responseData?.errorMessage ||
            responseData?.message ||
            `HTTP ${response.status}`,
          response.status,
          responseData,
          requestId,
          {
            url,
            method,
          }
        );
      }

      return responseData as T;
    } catch (error) {
      // Handle AbortError (timeout)
      if (error instanceof Error && error.name === 'AbortError') {
        throw new IyzicoNetworkError(
          `Request timeout after ${this.options.timeout}ms`,
          error,
          requestId
        );
      }

      // Handle network errors
      if (error instanceof TypeError && error.message.includes('fetch')) {
        throw new IyzicoNetworkError(
          'Network error: Unable to connect to Iyzico API',
          error,
          requestId
        );
      }

      // Re-throw IyzicoError subclasses as-is
      if (error instanceof IyzicoError) {
        throw error;
      }

      // Wrap other errors
      throw new IyzicoNetworkError(
        `Unexpected error: ${
          error instanceof Error ? error.message : String(error)
        }`,
        error instanceof Error ? error : undefined,
        requestId
      );
    }
  }

  /**
   * Determines if a request should be retried based on status code and retry count
   * @private
   */
  private shouldRetry(statusCode: number, retryCount: number): boolean {
    if (retryCount >= this.options.maxRetries) {
      return false;
    }

    // Retry on server errors (5xx) and specific client errors
    return (
      statusCode >= 500 || // Server errors
      statusCode === 408 || // Request Timeout
      statusCode === 429 // Rate Limited
    );
  }

  /**
   * Creates a delay for retry logic
   * @private
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Get client configuration (without sensitive data)
   */
  public getConfig() {
    return {
      baseUrl: this.options.baseUrl,
      timeout: this.options.timeout,
      maxRetries: this.options.maxRetries,
      debug: this.options.debug,
      isSandbox: this.options.isSandbox,
      environment: this.options.isSandbox ? 'sandbox' : 'production',
      apiKey: this.options.isSandbox
        ? this.options.sandboxApiKey
        : this.options.apiKey,
      sandboxApiKey: this.options.sandboxApiKey,
    };
  }
}
