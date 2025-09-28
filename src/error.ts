import type { IyzicoOptions, AuthManagerConfig } from './types';

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
