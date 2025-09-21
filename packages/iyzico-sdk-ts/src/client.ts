// packages/iyzico-sdk-ts/src/client.ts
import { generateAuthHeaders } from './auth';
import type { IyzicoOptions } from './types';
import { ProductsService } from './services/products';
import { PlansService } from './services/plans';
import { CheckoutService } from './services/checkout';
import { SubscriptionsService } from './services/subscriptions';
import { HealthService } from './services/health';

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
}

/**
 * A structured error thrown when the Iyzico API returns a non-2xx response.
 */
export class IyzicoApiError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
    public readonly responseData: any,
    public readonly requestId?: string
  ) {
    super(message);
    this.name = 'IyzicoApiError';

    // Capture stack trace if available
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, IyzicoApiError);
    }
  }

  /**
   * Returns a formatted error message with additional context
   */
  public getFormattedMessage(): string {
    const parts = [`[${this.statusCode}] ${this.message}`];

    if (this.requestId) {
      parts.push(`Request ID: ${this.requestId}`);
    }

    if (this.responseData?.errorCode) {
      parts.push(`Error Code: ${this.responseData.errorCode}`);
    }

    return parts.join(' | ');
  }
}

/**
 * Network or timeout related errors
 */
export class IyzicoNetworkError extends Error {
  constructor(message: string, public readonly cause?: Error) {
    super(message);
    this.name = 'IyzicoNetworkError';
  }
}

/**
 * The main client for interacting with the Iyzico v2 Subscription API.
 *
 * @example
 * ```typescript
 * const iyzico = new IyzicoClient({
 *   apiKey: 'your-api-key',
 *   secretKey: 'your-secret-key',
 *   debug: true, // Enable logging
 *   timeout: 10000 // 10 second timeout
 * });
 *
 * const product = await iyzico.products.create({
 *   name: 'My Product',
 *   description: 'Product description'
 * });
 * ```
 */
export class IyzicoClient {
  private readonly options: Required<IyzicoClientOptions>;

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
      throw new Error('Iyzico API Key is required and cannot be empty.');
    }

    if (!options.secretKey?.trim()) {
      throw new Error('Iyzico Secret Key is required and cannot be empty.');
    }

    // Set defaults and validate options
    this.options = {
      baseUrl: 'https://api.iyzipay.com',
      timeout: 30000, // 30 seconds
      maxRetries: 3,
      debug: false,
      ...options,
    };

    // Validate baseUrl format
    try {
      new URL(this.options.baseUrl);
    } catch {
      throw new Error('Invalid baseUrl provided. Must be a valid URL.');
    }

    // Validate numeric options
    if (this.options.timeout < 1000) {
      throw new Error('Timeout must be at least 1000ms (1 second).');
    }

    if (this.options.maxRetries < 0 || this.options.maxRetries > 10) {
      throw new Error('maxRetries must be between 0 and 10.');
    }

    // Log initialization if debug is enabled
    if (this.options.debug) {
      console.log('[IyzicoClient] Initialized with options:', {
        baseUrl: this.options.baseUrl,
        timeout: this.options.timeout,
        maxRetries: this.options.maxRetries,
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
      .substr(2, 9)}`;

    // Generate authentication headers
    const headers = generateAuthHeaders({
      apiKey: this.options.apiKey,
      secretKey: this.options.secretKey,
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
          requestId
        );
      }

      return responseData as T;
    } catch (error) {
      // Handle AbortError (timeout)
      if (error instanceof Error && error.name === 'AbortError') {
        throw new IyzicoNetworkError(
          `Request timeout after ${this.options.timeout}ms`,
          error
        );
      }

      // Handle network errors
      if (error instanceof TypeError && error.message.includes('fetch')) {
        throw new IyzicoNetworkError(
          'Network error: Unable to connect to Iyzico API',
          error
        );
      }

      // Re-throw IyzicoApiError and IyzicoNetworkError as-is
      if (
        error instanceof IyzicoApiError ||
        error instanceof IyzicoNetworkError
      ) {
        throw error;
      }

      // Wrap other errors
      throw new IyzicoNetworkError(
        `Unexpected error: ${
          error instanceof Error ? error.message : String(error)
        }`,
        error instanceof Error ? error : undefined
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
    };
  }
}
