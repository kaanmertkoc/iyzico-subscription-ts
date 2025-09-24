import { Context } from 'hono';
import {
  IyzicoError,
  IyzicoApiError,
  IyzicoNetworkError,
  IyzicoConfigError,
} from '@kaanmertkoc/iyzico-ts';

/**
 * Standard error response format
 */
export interface ErrorResponse {
  /** Whether the request was successful */
  success: false;
  /** Error classification */
  error: {
    /** Error type/category */
    type: string;
    /** Human-readable error message */
    message: string;
    /** User-friendly message (safe to show to end users) */
    userMessage?: string;
    /** Error code from the API */
    code?: string;
    /** Error group/category from the API */
    group?: string;
    /** Request ID for tracking */
    requestId?: string;
    /** Additional error details (only in development) */
    details?: Record<string, unknown>;
  };
  /** Timestamp when the error occurred */
  timestamp: number;
  /** Whether this error might be retryable */
  retryable?: boolean;
}

/**
 * Standard success response format
 */
export interface SuccessResponse<T = unknown> {
  /** Whether the request was successful */
  success: true;
  /** Response data */
  data: T;
  /** Timestamp when the response was generated */
  timestamp: number;
}

/**
 * Union type for all API responses
 */
export type ApiResponse<T = unknown> = SuccessResponse<T> | ErrorResponse;

/**
 * Enhanced error handler that properly extracts and formats all error information
 * from Iyzico SDK errors, following best practices from Stripe, Shopify, etc.
 */
export class IyzicoErrorHandler {
  private readonly isDevelopment: boolean;

  constructor(isDevelopment: boolean = process.env.NODE_ENV === 'development') {
    this.isDevelopment = isDevelopment;
  }

  /**
   * Main error handling method - converts any error to a structured response
   */
  public handleError(error: unknown): {
    response: ErrorResponse;
    statusCode: number;
  } {
    const timestamp = Date.now();

    // Handle Iyzico API errors (400, 500 responses from the API)
    if (error instanceof IyzicoApiError) {
      return {
        response: {
          success: false,
          error: {
            type: 'API_ERROR',
            message: error.message,
            userMessage: error.getUserFriendlyMessage(),
            ...(error.errorCode && { code: error.errorCode }),
            ...(error.errorGroup && { group: error.errorGroup }),
            ...(error.requestId && { requestId: error.requestId }),
            ...(this.isDevelopment && {
              details: {
                url: error.url,
                method: error.method,
                responseData: error.responseData,
                stack: error.stack,
              },
            }),
          },
          timestamp,
          retryable: error.isRetryable(),
        },
        statusCode: this.mapStatusCode(error.statusCode),
      };
    }

    // Handle network/timeout errors
    if (error instanceof IyzicoNetworkError) {
      return {
        response: {
          success: false,
          error: {
            type: error.isTimeout ? 'TIMEOUT_ERROR' : 'NETWORK_ERROR',
            message: error.message,
            userMessage: error.isTimeout
              ? 'Request timed out. Please try again.'
              : 'Network error occurred. Please check your connection and try again.',
            ...(error.requestId && { requestId: error.requestId }),
            ...(this.isDevelopment && {
              details: {
                cause: error.cause,
                isTimeout: error.isTimeout,
                stack: error.stack,
              },
            }),
          },
          timestamp,
          retryable: true,
        },
        statusCode: error.isTimeout ? 408 : 503,
      };
    }

    // Handle configuration errors
    if (error instanceof IyzicoConfigError) {
      return {
        response: {
          success: false,
          error: {
            type: 'CONFIG_ERROR',
            message: error.message,
            userMessage: 'Service configuration error. Please contact support.',
            ...(error.requestId && { requestId: error.requestId }),
            ...(this.isDevelopment && {
              details: {
                configField: error.configField,
                stack: error.stack,
              },
            }),
          },
          timestamp,
          retryable: false,
        },
        statusCode: 500,
      };
    }

    // Handle other Iyzico SDK errors
    if (error instanceof IyzicoError) {
      return {
        response: {
          success: false,
          error: {
            type: 'SDK_ERROR',
            message: error.message,
            userMessage: 'An error occurred while processing your request.',
            ...(error.requestId && { requestId: error.requestId }),
            ...(this.isDevelopment && {
              details: {
                stack: error.stack,
              },
            }),
          },
          timestamp,
          retryable: false,
        },
        statusCode: 500,
      };
    }

    // Handle validation errors (from Hono validator)
    if (error && typeof error === 'object' && 'message' in error) {
      const errorObj = error as { message: string; [key: string]: unknown };
      if (errorObj.message?.includes('validation') || errorObj.message?.includes('Invalid')) {
        return {
          response: {
            success: false,
            error: {
              type: 'VALIDATION_ERROR',
              message: errorObj.message,
              userMessage: 'Invalid request data provided.',
              ...(this.isDevelopment && {
                details: {
                  originalError: errorObj,
                },
              }),
            },
            timestamp,
            retryable: false,
          },
          statusCode: 400,
        };
      }
    }

    // Handle generic JavaScript errors
    if (error instanceof Error) {
      return {
        response: {
          success: false,
          error: {
            type: 'INTERNAL_ERROR',
            message: this.isDevelopment ? error.message : 'An unexpected error occurred',
            userMessage: 'An unexpected error occurred. Please try again later.',
            ...(this.isDevelopment && {
              details: {
                name: error.name,
                stack: error.stack,
              },
            }),
          },
          timestamp,
          retryable: false,
        },
        statusCode: 500,
      };
    }

    // Handle unknown error types
    return {
      response: {
        success: false,
        error: {
          type: 'UNKNOWN_ERROR',
          message: 'An unexpected error occurred',
          userMessage: 'An unexpected error occurred. Please try again later.',
          ...(this.isDevelopment && {
            details: {
              originalError: error,
            },
          }),
        },
        timestamp,
        retryable: false,
      },
      statusCode: 500,
    };
  }

  /**
   * Maps Iyzico API status codes to appropriate HTTP response codes for client
   * Some API errors should be mapped differently for better UX
   */
  private mapStatusCode(apiStatusCode: number): number {
    // Map specific API error codes to more appropriate client response codes
    switch (apiStatusCode) {
      case 401:
        return 500; // Don't expose auth errors to client, treat as server error
      case 403:
        return 500; // Don't expose permission errors to client
      case 422:
        return 400; // Validation errors should be 400 Bad Request
      default:
        return apiStatusCode;
    }
  }

  /**
   * Creates a success response
   */
  public static createSuccessResponse<T>(data: T): SuccessResponse<T> {
    return {
      success: true,
      data,
      timestamp: Date.now(),
    };
  }

  /**
   * Hono middleware for automatic error handling
   */
  public middleware() {
    return async (c: Context, next: () => Promise<void>): Promise<Response | void> => {
      try {
        await next();
      } catch (error) {
        const { response, statusCode } = this.handleError(error);

        // Log the error for monitoring (but don't expose sensitive details)
        if (error instanceof IyzicoError) {
          console.error('Iyzico SDK Error:', {
            type: error.name,
            message: error.message,
            requestId: error.requestId,
            ...(error instanceof IyzicoApiError && {
              statusCode: error.statusCode,
              errorCode: error.errorCode,
              url: error.url,
              method: error.method,
            }),
          });
        } else {
          console.error('Unexpected Error:', error);
        }

        return c.json(response, statusCode as Parameters<typeof c.json>[1]);
      }
    };
  }
}

/**
 * Default error handler instance
 */
export const errorHandler = new IyzicoErrorHandler();

/**
 * Utility function to wrap async route handlers with proper error handling
 */
export function withErrorHandler<T extends [Context, ...unknown[]]>(
  handler: (...args: T) => Promise<Response | void>
) {
  return async (...args: T): Promise<Response> => {
    try {
      const result = await handler(...args);
      return result || new Response('OK');
    } catch (error) {
      const { response, statusCode } = errorHandler.handleError(error);
      const [context] = args; // First argument is guaranteed to be Context
      return context.json(response, statusCode as Parameters<Context['json']>[1]);
    }
  };
}

/**
 * Helper to create standardized success responses
 */
export function success<T>(data: T): SuccessResponse<T> {
  return IyzicoErrorHandler.createSuccessResponse(data);
}
