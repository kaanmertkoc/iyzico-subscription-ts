import { ErrorCategory, IyzicoErrorUtils } from '@kaanmertkoc/iyzico-ts';
import { Context } from 'hono';

/**
 * Standard error response format
 */
export interface ErrorResponse {
  success: false;
  error: {
    type: string;
    message: string;
    userMessage?: string;
    code?: string;
    group?: string;
    requestId?: string;
    details?: Record<string, unknown>;
  };
  timestamp: number;
  retryable?: boolean;
}

/**
 * Standard success response format
 */
export interface SuccessResponse<T = unknown> {
  success: true;
  data: T;
  timestamp: number;
}

/**
 * Union type for all API responses
 */
export type ApiResponse<T = unknown> = SuccessResponse<T> | ErrorResponse;

export class IyzicoErrorHandler {
  private readonly isDevelopment: boolean;

  constructor(isDevelopment: boolean = process.env.NODE_ENV === 'development') {
    this.isDevelopment = isDevelopment;
  }

  public handleError(error: unknown): {
    response: ErrorResponse;
    statusCode: number;
  } {
    const timestamp = Date.now();

    // Use SDK utilities for consistent error handling
    const category = IyzicoErrorUtils.getErrorCategory(error);
    const userMessage = IyzicoErrorUtils.getUserFriendlyMessage(error);
    const isRetryable = IyzicoErrorUtils.isRetryable(error);

    // Handle Iyzico SDK errors with enhanced information from SDK
    if (IyzicoErrorUtils.isIyzicoError(error)) {
      const statusCode = IyzicoErrorUtils.isApiError(error)
        ? this.mapStatusCode(error.statusCode)
        : this.getStatusCodeFromCategory(category);

      return {
        response: {
          success: false,
          error: {
            type: this.getErrorTypeFromCategory(category),
            message: error.message,
            userMessage,
            ...(IyzicoErrorUtils.isApiError(error) && {
              code: error.errorCode,
              group: error.errorGroup,
            }),
            ...(error.requestId && { requestId: error.requestId }),
            ...(this.isDevelopment && {
              details: this.getErrorDetails(error),
            }),
          },
          timestamp,
          retryable: isRetryable,
        },
        statusCode,
      };
    }

    // Handle validation errors (from Hono validator)
    if (error && typeof error === 'object' && 'message' in error) {
      const errorObj = error as { message: string; [key: string]: unknown };
      if (
        errorObj.message?.includes('validation') ||
        errorObj.message?.includes('Invalid')
      ) {
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
            message: this.isDevelopment
              ? error.message
              : 'An unexpected error occurred',
            userMessage,
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
          userMessage,
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
   * Gets appropriate HTTP status code from error category
   */
  private getStatusCodeFromCategory(category: ErrorCategory): number {
    switch (category) {
      case ErrorCategory.AUTHENTICATION:
      case ErrorCategory.AUTHORIZATION:
      case ErrorCategory.CONFIGURATION:
        return 500;
      case ErrorCategory.VALIDATION:
        return 400;
      case ErrorCategory.RATE_LIMIT:
        return 429;
      case ErrorCategory.NETWORK:
        return 503;
      case ErrorCategory.SERVER:
        return 500;
      default:
        return 500;
    }
  }

  /**
   * Gets error type string from category
   */
  private getErrorTypeFromCategory(category: ErrorCategory): string {
    switch (category) {
      case ErrorCategory.AUTHENTICATION:
        return 'AUTH_ERROR';
      case ErrorCategory.AUTHORIZATION:
        return 'PERMISSION_ERROR';
      case ErrorCategory.VALIDATION:
        return 'VALIDATION_ERROR';
      case ErrorCategory.PAYMENT:
        return 'PAYMENT_ERROR';
      case ErrorCategory.SUBSCRIPTION:
        return 'SUBSCRIPTION_ERROR';
      case ErrorCategory.NETWORK:
        return 'NETWORK_ERROR';
      case ErrorCategory.CONFIGURATION:
        return 'CONFIG_ERROR';
      case ErrorCategory.RATE_LIMIT:
        return 'RATE_LIMIT_ERROR';
      case ErrorCategory.SERVER:
        return 'SERVER_ERROR';
      default:
        return 'UNKNOWN_ERROR';
    }
  }

  /**
   * Gets detailed error information for development mode
   */
  private getErrorDetails(error: unknown): Record<string, unknown> {
    return IyzicoErrorUtils.formatForLogging(error);
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
    return async (
      c: Context,
      next: () => Promise<void>
    ): Promise<Response | void> => {
      try {
        await next();
      } catch (error) {
        const { response, statusCode } = this.handleError(error);

        // Log the error for monitoring using SDK's safe logging utility
        if (IyzicoErrorUtils.isIyzicoError(error)) {
          console.error(
            'Iyzico SDK Error:',
            IyzicoErrorUtils.formatForLogging(error)
          );
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
      return context.json(
        response,
        statusCode as Parameters<Context['json']>[1]
      );
    }
  };
}

/**
 * Helper to create standardized success responses
 */
export function success<T>(data: T): SuccessResponse<T> {
  return IyzicoErrorHandler.createSuccessResponse(data);
}
