import { AuthManager } from './auth';
import type { AuthManagerConfig } from './types';
import { ProductsService } from './services/products';
import { PlansService } from './services/plans';
import { CheckoutService } from './services/checkout';
import { SubscriptionsService } from './services/subscriptions';
import { HealthService } from './services/health';
import type { IyzicoClientOptions } from './error';
import {
  IyzicoConfigError,
  IyzicoApiError,
  IyzicoNetworkError,
  IyzicoError,
  IyzicoApiErrorResponse,
  IyzicoSandboxLimitationError,
  isSandboxLimitationError,
} from './error';

export const IYZICO_BASE_URL = 'https://api.iyzipay.com';
export const IYZICO_SANDBOX_BASE_URL = 'https://sandbox-api.iyzipay.com';

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
    Omit<
      IyzicoClientOptions,
      | 'sandboxApiKey'
      | 'sandboxSecretKey'
      | 'authConfig'
      | 'userAgent'
      | 'defaultHeaders'
    >
  > & {
    sandboxApiKey?: string;
    sandboxSecretKey?: string;
    authConfig?: AuthManagerConfig;
    userAgent?: string;
    defaultHeaders?: Record<string, string>;
  };

  /** Authentication manager for generating secure headers */
  private readonly authManager: AuthManager;

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

  /**
   * Check if client is configured for sandbox environment
   */
  public get isSandbox(): boolean {
    return this.options.isSandbox;
  }

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
      defaultHeaders: {},
      ...options,
    };

    // Initialize authentication manager
    this.authManager = new AuthManager({
      debug: this.options.debug,
      ...this.options.authConfig,
    });

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

    // Warn about sandbox limitations
    if (this.options.isSandbox) {
      console.warn(
        '\n⚠️  Iyzico Sandbox Limitation Notice:\n' +
          '   Subscription routes (/v2/subscription/*) are NOT available in sandbox.\n' +
          '   Only health check endpoints work in sandbox.\n' +
          '   Use production credentials to test subscription features.\n' +
          '   See: https://github.com/kaanmertkoc/iyzico-subscription-ts#sandbox-limitations\n'
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

    if (this.options.debug) {
      console.log('[IyzicoSDK] Starting request:', {
        method,
        path,
        url,
        hasBody: !!body,
        retryAttempt: retryCount,
      });
    }
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

    // Extract path without query parameters for authentication signature
    // According to Iyzico docs, HMAC signature should only include the URI path, not query string
    const pathWithoutQuery = path.split('?')[0];
    
    // Generate authentication headers using AuthManager
    const authResult = this.authManager.generateAuthHeaders({
      apiKey: this.options.isSandbox
        ? this.options.sandboxApiKey!
        : this.options.apiKey,
      secretKey: this.options.isSandbox
        ? this.options.sandboxSecretKey!
        : this.options.secretKey,
      path: pathWithoutQuery,
      body: requestBodyString,
    });

    // Combine auth headers with default headers and request tracking
    const requestHeaders: Record<string, string> = {
      ...this.options.defaultHeaders,
      Authorization: authResult.headers.Authorization,
      'x-iyzi-rnd': authResult.headers['x-iyzi-rnd'],
      'Content-Type': authResult.headers['Content-Type'],
      Accept: authResult.headers.Accept,
      'X-Request-ID': requestId,
    };

    // Add user agent if provided
    if (this.options.userAgent) {
      requestHeaders['User-Agent'] = this.options.userAgent;
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

      if (this.options.debug) {
        console.log('[IyzicoSDK] Making HTTP request:', {
          url,
          method,
          bodySize: requestBody?.length || 0,
          timeout: this.options.timeout,
          requestId,
        });
      }

      const response = await fetch(url, {
        method,
        headers: requestHeaders,
        body: requestBody,
        signal: controller.signal,
      });

      if (this.options.debug) {
        console.log('[IyzicoSDK] HTTP response received:', {
          status: response.status,
          statusText: response.statusText,
          requestId,
        });
      }

      clearTimeout(timeoutId);

      // Parse response
      let responseData: unknown;
      const contentType = response.headers.get('content-type');

      if (contentType?.includes('application/json')) {
        responseData = (await response.json()) as unknown;
      } else {
        const textData = await response.text();
        if (this.options.debug) {
          console.warn('[IyzicoSDK] Non-JSON response received:', textData);
        }
        responseData = { rawResponse: textData };
      }

      if (this.options.debug) {
        const debugData =
          responseData && typeof responseData === 'object'
            ? (responseData as Record<string, unknown>)
            : {};
        console.log('[IyzicoSDK] Request completed successfully:', {
          requestId,
          status: response.status,
          dataKeys:
            responseData && typeof responseData === 'object'
              ? Object.keys(debugData)
              : [],
          success: debugData?.status === 'success',
        });
      }

      // Handle non-2xx responses
      if (!response.ok) {
        // Check if we should retry
        if (this.shouldRetry(response.status, retryCount)) {
          if (this.options.debug) {
            console.log('[IyzicoSDK] Retrying request:', {
              attempt: retryCount + 1,
              maxRetries: this.options.maxRetries,
              status: response.status,
              requestId,
            });
          }

          // Wait before retry (exponential backoff)
          await this.delay(Math.min(1000 * Math.pow(2, retryCount), 10000));

          return this.request<T>({
            ...requestConfig,
            retryCount: retryCount + 1,
          });
        }

        const errorData =
          responseData && typeof responseData === 'object'
            ? (responseData as IyzicoApiErrorResponse)
            : {};

        const apiError = new IyzicoApiError(
          errorData?.errorMessage ||
            errorData?.message ||
            `HTTP ${response.status}`,
          response.status,
          errorData,
          requestId,
          {
            url,
            method,
          }
        );

        // Check if this is a sandbox limitation error
        if (isSandboxLimitationError(apiError, this.options.isSandbox, path)) {
          throw new IyzicoSandboxLimitationError(path, requestId);
        }

        throw apiError;
      }

      return responseData as T;
    } catch (error) {
      if (this.options.debug) {
        console.error('[IyzicoSDK] Request failed:', {
          error: error instanceof Error ? error.message : String(error),
          errorType: error instanceof Error ? error.name : typeof error,
          requestId,
          url,
        });
      }

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
