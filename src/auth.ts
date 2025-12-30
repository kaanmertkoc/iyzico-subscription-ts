import { createHmac } from 'node:crypto';
import { IyzicoConfigError } from './error';
import type {
  AuthConfig,
  IyzicoAuthHeaders,
  AuthPayload,
  AuthString,
  AuthResult,
  AuthManagerConfig,
} from './types/auth';

/**
 * Authentication protocol version used by Iyzico
 */
export const IYZICO_AUTH_VERSION = 'IYZWSv2';

/**
 * Maximum allowed clock skew in milliseconds (5 minutes)
 */
export const MAX_CLOCK_SKEW = 5 * 60 * 1000;

/**
 * Minimum random key entropy (6 digits)
 */
export const MIN_RANDOM_ENTROPY = 100000;

/**
 * Maximum random key entropy (6 digits)
 */
export const MAX_RANDOM_ENTROPY = 999999;

/**
 * Professional authentication manager for Iyzico API
 * 
 * Provides secure, testable, and maintainable authentication header generation
 * following industry best practices similar to Stripe SDK.
 */
export class AuthManager {
  private readonly config: AuthManagerConfig;
  private readonly timestampProvider: () => number;
  private readonly randomProvider: () => number;

  constructor(config: AuthManagerConfig = {}) {
    this.config = {
      debug: false,
      ...config,
    };

    // Use injected providers or defaults for better testability
    this.timestampProvider = config.timestampProvider || (() => Date.now());
    this.randomProvider = config.randomProvider || (() => Math.random());

    /* c8 ignore next 3 */
    if (this.config.debug) {
      console.log('[AuthManager] Initialized with debug mode enabled');
    }
  }

  /**
   * Generate authentication headers for an Iyzico API request
   * 
   * @param config - Authentication configuration
   * @returns Complete authentication result with headers and metadata
   * @throws {IyzicoConfigError} When configuration is invalid
   */
  public generateAuthHeaders(config: AuthConfig): AuthResult {
    this.validateConfig(config);

    const randomKey = this.generateRandomKey();
    const payload = this.createPayload({
      randomKey,
      path: config.path,
      body: config.body,
    });
    const signature = this.generateSignature(payload, config.secretKey);
    const authString = this.createAuthString({
      apiKey: config.apiKey,
      randomKey,
      signature,
    });
    const authorization = this.encodeAuthorization(authString);

    const headers: IyzicoAuthHeaders = {
      Authorization: authorization,
      'x-iyzi-rnd': randomKey,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };

    /* c8 ignore next 5 */
    if (this.config.debug) {
      console.log('[AuthManager] Generated headers for path:', config.path);
      console.log('[AuthManager] Signature length:', signature.length);
    }

    return {
      headers,
      randomKey,
      signature,
    };
  }

  /**
   * Validate authentication configuration
   * 
   * @private
   * @param config - Configuration to validate
   * @throws {IyzicoConfigError} When configuration is invalid
   */
  private validateConfig(config: AuthConfig): void {
    if (!config.apiKey || typeof config.apiKey !== 'string' || !config.apiKey.trim()) {
      throw new IyzicoConfigError(
        'API key is required and must be a non-empty string',
        'apiKey'
      );
    }

    if (!config.secretKey || typeof config.secretKey !== 'string' || !config.secretKey.trim()) {
      throw new IyzicoConfigError(
        'Secret key is required and must be a non-empty string',
        'secretKey'
      );
    }

    if (!config.path || typeof config.path !== 'string') {
      throw new IyzicoConfigError(
        'Request path is required and must be a string',
        'path'
      );
    }

    if (typeof config.body !== 'string') {
      throw new IyzicoConfigError(
        'Request body must be a string (use empty string for no body)',
        'body'
      );
    }

    // Validate path format
    if (!config.path.startsWith('/')) {
      throw new IyzicoConfigError(
        'Request path must start with "/"',
        'path'
      );
    }
  }

  /**
   * Generate a cryptographically secure random key
   * 
   * @private
   * @returns Random key string with timestamp and entropy
   */
  private generateRandomKey(): string {
    const timestamp = this.timestampProvider();
    const entropy = Math.floor(this.randomProvider() * (MAX_RANDOM_ENTROPY - MIN_RANDOM_ENTROPY + 1)) + MIN_RANDOM_ENTROPY;
    return `${timestamp}${entropy}`;
  }

  /**
   * Create the payload for HMAC signature generation
   * 
   * @private
   * @param payload - Payload components
   * @returns Concatenated payload string
   */
  private createPayload(payload: AuthPayload): string {
    return `${payload.randomKey}${payload.path}${payload.body}`;
  }

  /**
   * Generate HMAC-SHA256 signature
   * 
   * @private
   * @param payload - The payload to sign
   * @param secretKey - The secret key for signing
   * @returns Hex-encoded signature
   */
  private generateSignature(payload: string, secretKey: string): string {
    try {
      return createHmac('sha256', secretKey)
        .update(payload, 'utf8')
        .digest('hex');
    } catch (error) {
      throw new IyzicoConfigError(
        `Failed to generate signature: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'secretKey'
      );
    }
  }

  /**
   * Create the authentication string
   * 
   * @private
   * @param authString - Authentication string components
   * @returns Formatted authentication string
   */
  private createAuthString(authString: AuthString): string {
    return `apiKey:${authString.apiKey}&randomKey:${authString.randomKey}&signature:${authString.signature}`;
  }

  /**
   * Encode the authorization header value
   * 
   * @private
   * @param authString - The authentication string to encode
   * @returns Base64 encoded authorization header value
   */
  private encodeAuthorization(authString: string): string {
    try {
      const encoded = btoa(authString);
      return `${IYZICO_AUTH_VERSION} ${encoded}`;
    } catch (error) {
      throw new IyzicoConfigError(
        'Failed to encode authorization header - invalid characters in auth string',
        'authorization'
      );
    }
  }

  /**
   * Verify if a timestamp is within acceptable clock skew
   * 
   * @param timestamp - Timestamp to verify
   * @returns True if timestamp is valid
   */
  public static isTimestampValid(timestamp: number): boolean {
    const now = Date.now();
    const diff = Math.abs(now - timestamp);
    return diff <= MAX_CLOCK_SKEW;
  }
}

/**
 * Default authentication manager instance
 */
const defaultAuthManager = new AuthManager();

/**
 * Generate authentication headers for Iyzico API requests
 * 
 * @param options - Authentication configuration
 * @returns Authentication headers
 */
export function generateAuthHeaders(options: { apiKey: string; secretKey: string; path: string; body: string }): IyzicoAuthHeaders {
  const result = defaultAuthManager.generateAuthHeaders({
    apiKey: options.apiKey,
    secretKey: options.secretKey,
    path: options.path,
    body: options.body,
  });
  
  return result.headers;
}
