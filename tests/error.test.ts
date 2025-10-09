import { describe, expect, test } from 'vitest';
import {
  IyzicoError,
  IyzicoApiError,
  IyzicoNetworkError,
  IyzicoConfigError,
  IyzicoSandboxLimitationError,
  isSandboxLimitationError,
  IyzicoErrorUtils,
  IYZICO_ERROR_MESSAGES,
  ErrorSeverity,
  ErrorCategory,
  type IyzicoApiErrorResponse,
} from '../src/error';

describe('IyzicoError Base Class', () => {
  test('should create basic error with message', () => {
    const error = new (class TestError extends IyzicoError {})(
      'Test error message'
    );

    expect(error.message).toBe('Test error message');
    expect(error.name).toBe('TestError');
    expect(error.requestId).toBeUndefined();
    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(IyzicoError);
  });

  test('should create error with request ID', () => {
    const error = new (class TestError extends IyzicoError {})(
      'Test error message',
      'req_12345'
    );

    expect(error.message).toBe('Test error message');
    expect(error.requestId).toBe('req_12345');
  });

  test('should create proper JSON representation', () => {
    const error = new (class TestError extends IyzicoError {})(
      'Test error message',
      'req_12345'
    );

    const json = error.toJSON();
    expect(json).toEqual({
      name: 'TestError',
      message: 'Test error message',
      requestId: 'req_12345',
      stack: expect.any(String),
    });
  });
});

describe('IyzicoApiError', () => {
  const mockResponseData: IyzicoApiErrorResponse = {
    status: 'failure',
    errorMessage: 'Invalid card number',
    errorCode: 'INVALID_CARD',
    errorGroup: 'PAYMENT_ERROR',
  };

  test('should create API error with all details', () => {
    const error = new IyzicoApiError(
      'API error occurred',
      400,
      mockResponseData,
      'req_12345',
      {
        url: 'https://api.iyzipay.com/v2/subscription',
        method: 'POST',
      }
    );

    expect(error.message).toBe('API error occurred');
    expect(error.statusCode).toBe(400);
    expect(error.errorCode).toBe('INVALID_CARD');
    expect(error.errorGroup).toBe('PAYMENT_ERROR');
    expect(error.responseData).toEqual(mockResponseData);
    expect(error.url).toBe('https://api.iyzipay.com/v2/subscription');
    expect(error.method).toBe('POST');
    expect(error.requestId).toBe('req_12345');
  });

  test('should return formatted error message', () => {
    const error = new IyzicoApiError(
      'API error occurred',
      400,
      mockResponseData,
      'req_12345'
    );

    const formatted = error.getFormattedMessage();
    expect(formatted).toBe(
      '[400] API error occurred | Code: INVALID_CARD | Group: PAYMENT_ERROR | Request ID: req_12345'
    );
  });

  test('should return user-friendly message for known error codes', () => {
    const errorWithNumericCode = new IyzicoApiError('API error occurred', 400, {
      errorCode: '1',
      errorMessage: 'System error',
    });

    const userMessage = errorWithNumericCode.getUserFriendlyMessage();
    expect(userMessage).toBe('System error occurred');
  });

  test('should return generic message for unknown error codes', () => {
    const unknownResponseData: IyzicoApiErrorResponse = {
      status: 'failure',
      errorMessage: 'Unknown error',
      errorCode: 'UNKNOWN_ERROR_CODE',
    };

    const error = new IyzicoApiError(
      'Unknown API error',
      400,
      unknownResponseData
    );

    const userMessage = error.getUserFriendlyMessage();
    expect(userMessage).toBe('Unknown API error');
  });

  test('should return server error message for 5xx status codes', () => {
    const error = new IyzicoApiError('Server error', 500, {
      status: 'failure',
      errorMessage: 'Internal server error',
    });

    const userMessage = error.getUserFriendlyMessage();
    expect(userMessage).toBe(
      'Service temporarily unavailable. Please try again later.'
    );
  });

  test('should return rate limit message for 429 status code', () => {
    const error = new IyzicoApiError('Rate limited', 429, {
      status: 'failure',
      errorMessage: 'Too many requests',
    });

    const userMessage = error.getUserFriendlyMessage();
    expect(userMessage).toBe(
      'Too many requests. Please try again in a few moments.'
    );
  });

  describe('error categorization', () => {
    test('should categorize authentication errors', () => {
      const error = new IyzicoApiError('Auth failed', 401, {
        errorCode: 'AUTH_FAILED',
      });

      expect(error.getCategory()).toBe(ErrorCategory.AUTHENTICATION);
    });

    test('should categorize authorization errors', () => {
      const error = new IyzicoApiError('Forbidden', 403, {});

      expect(error.getCategory()).toBe(ErrorCategory.AUTHORIZATION);
    });

    test('should categorize rate limit errors', () => {
      const error = new IyzicoApiError('Rate limited', 429, {});

      expect(error.getCategory()).toBe(ErrorCategory.RATE_LIMIT);
    });

    test('should categorize subscription errors', () => {
      const error = new IyzicoApiError('Subscription error', 400, {
        errorCode: 'SUBSCRIPTION_NOT_FOUND',
      });

      expect(error.getCategory()).toBe(ErrorCategory.SUBSCRIPTION);
    });

    test('should categorize payment errors', () => {
      const error = new IyzicoApiError('Payment error', 400, {
        errorCode: 'PAYMENT_FAILED',
      });

      expect(error.getCategory()).toBe(ErrorCategory.PAYMENT);
    });

    test('should categorize server errors', () => {
      const error = new IyzicoApiError('Server error', 500, {});

      expect(error.getCategory()).toBe(ErrorCategory.SERVER);
    });

    test('should categorize validation errors as default', () => {
      const error = new IyzicoApiError('Validation error', 400, {});

      expect(error.getCategory()).toBe(ErrorCategory.VALIDATION);
    });
  });

  describe('error severity', () => {
    test('should assign high severity to server errors', () => {
      const error = new IyzicoApiError('Server error', 500, {});

      expect(error.getSeverity()).toBe(ErrorSeverity.HIGH);
    });

    test('should assign medium severity to rate limit errors', () => {
      const error = new IyzicoApiError('Rate limited', 429, {});

      expect(error.getSeverity()).toBe(ErrorSeverity.MEDIUM);
    });

    test('should assign high severity to auth errors', () => {
      const error = new IyzicoApiError('Unauthorized', 401, {});

      expect(error.getSeverity()).toBe(ErrorSeverity.HIGH);
    });

    test('should assign critical severity to fraud errors', () => {
      const error = new IyzicoApiError('Fraud detected', 400, {
        errorCode: 'FRAUD_SUSPECTED',
      });

      expect(error.getSeverity()).toBe(ErrorSeverity.CRITICAL);
    });

    test('should assign low severity to validation errors', () => {
      const error = new IyzicoApiError('Validation error', 400, {});

      expect(error.getSeverity()).toBe(ErrorSeverity.LOW);
    });
  });

  describe('error classification methods', () => {
    test('should correctly identify retryable errors', () => {
      const serverError = new IyzicoApiError('Server error', 500, {});
      const rateLimitError = new IyzicoApiError('Rate limit', 429, {});
      const validationError = new IyzicoApiError('Validation error', 400, {});

      expect(serverError.isRetryable()).toBe(true);
      expect(rateLimitError.isRetryable()).toBe(true);
      expect(validationError.isRetryable()).toBe(false);
    });

    test('should correctly identify client errors', () => {
      const clientError = new IyzicoApiError('Client error', 400, {});
      const serverError = new IyzicoApiError('Server error', 500, {});

      expect(clientError.isClientError()).toBe(true);
      expect(serverError.isClientError()).toBe(false);
    });

    test('should correctly identify server errors', () => {
      const serverError = new IyzicoApiError('Server error', 500, {});
      const clientError = new IyzicoApiError('Client error', 400, {});

      expect(serverError.isServerError()).toBe(true);
      expect(clientError.isServerError()).toBe(false);
    });
  });

  test('should include all details in JSON representation', () => {
    const error = new IyzicoApiError(
      'API error',
      400,
      {
        errorCode: '11',
        errorMessage: 'Invalid request',
        errorGroup: 'VALIDATION',
      },
      'req_12345',
      {
        url: 'https://api.iyzipay.com/v2/test',
        method: 'POST',
      }
    );

    const json = error.toJSON();
    expect(json).toEqual({
      name: 'IyzicoApiError',
      message: 'API error',
      requestId: 'req_12345',
      stack: expect.any(String),
      statusCode: 400,
      errorCode: '11',
      errorGroup: 'VALIDATION',
      responseData: {
        errorCode: '11',
        errorMessage: 'Invalid request',
        errorGroup: 'VALIDATION',
      },
      url: 'https://api.iyzipay.com/v2/test',
      method: 'POST',
      isRetryable: false,
      isClientError: true,
      isServerError: false,
      userFriendlyMessage: 'Invalid request',
      category: ErrorCategory.VALIDATION,
      severity: ErrorSeverity.LOW,
    });
  });
});

describe('IyzicoNetworkError', () => {
  test('should create network error', () => {
    const cause = new Error('Network failed');
    const error = new IyzicoNetworkError(
      'Network error occurred',
      cause,
      'req_12345'
    );

    expect(error.message).toBe('Network error occurred');
    expect(error.cause).toBe(cause);
    expect(error.requestId).toBe('req_12345');
    expect(error.isTimeout).toBe(false);
  });

  test('should detect timeout errors', () => {
    const timeoutError = new IyzicoNetworkError(
      'Request timeout occurred',
      new Error('timeout')
    );

    expect(timeoutError.isTimeout).toBe(true);
  });

  test('should detect AbortError as timeout', () => {
    const abortError = new Error('Request aborted');
    abortError.name = 'AbortError';
    const error = new IyzicoNetworkError('Request was aborted', abortError);

    expect(error.isTimeout).toBe(true);
  });

  test('should create proper JSON representation', () => {
    const cause = new Error('Network failed');
    const error = new IyzicoNetworkError('Network error', cause, 'req_12345');

    const json = error.toJSON();
    expect(json).toEqual({
      name: 'IyzicoNetworkError',
      message: 'Network error',
      requestId: 'req_12345',
      stack: expect.any(String),
      isTimeout: false,
      cause: {
        name: 'Error',
        message: 'Network failed',
      },
    });
  });
});

describe('IyzicoSandboxLimitationError', () => {
  test('should create sandbox limitation error', () => {
    const error = new IyzicoSandboxLimitationError(
      '/v2/subscription/products',
      'req_12345'
    );

    expect(error.name).toBe('IyzicoSandboxLimitationError');
    expect(error.message).toBe(
      'Sandbox environment does not support: /v2/subscription/products'
    );
    expect(error.statusCode).toBe(422);
    expect(error.errorCode).toBe('100001');
    expect(error.errorGroup).toBe('SANDBOX_LIMITATION');
    expect(error.requestId).toBe('req_12345');
  });

  test('should return helpful user-friendly message', () => {
    const error = new IyzicoSandboxLimitationError('/v2/subscription/products');
    const message = error.getUserFriendlyMessage();

    expect(message).toContain('sandbox does not support subscription routes');
    expect(message).toContain('production credentials');
    expect(message).toContain('health check');
  });

  test('should categorize as configuration error', () => {
    const error = new IyzicoSandboxLimitationError('/v2/subscription/products');
    expect(error.getCategory()).toBe(ErrorCategory.CONFIGURATION);
  });

  test('should not be retryable', () => {
    const error = new IyzicoSandboxLimitationError('/v2/subscription/products');
    expect(error.isRetryable()).toBe(false);
  });

  test('should include path in response data', () => {
    const error = new IyzicoSandboxLimitationError('/v2/subscription/plans');
    expect(error.url).toBe('/v2/subscription/plans');
  });

  test('should expose affectedRoute property', () => {
    const error = new IyzicoSandboxLimitationError('/v2/subscription/products');
    expect(error.affectedRoute).toBe('/v2/subscription/products');
  });

  test('should provide actionable suggestion', () => {
    const error = new IyzicoSandboxLimitationError('/v2/subscription/products');
    const suggestion = error.getSuggestion();

    expect(suggestion).toContain('production credentials');
    expect(suggestion).toContain('isSandbox: false');
    expect(suggestion).toContain('https://github.com');
  });

  test('should include documentation link in user-friendly message', () => {
    const error = new IyzicoSandboxLimitationError('/v2/subscription/products');
    const message = error.getUserFriendlyMessage();

    expect(message).toContain(
      'https://github.com/kaanmertkoc/iyzico-subscription-ts'
    );
  });
});

describe('isSandboxLimitationError helper', () => {
  test('should detect sandbox limitation error with 422 and error code 100001', () => {
    const responseData: IyzicoApiErrorResponse = {
      status: 'failure',
      errorCode: '100001',
      errorMessage: 'Sistem hatası',
    };

    const apiError = new IyzicoApiError(
      'Sistem hatası',
      422,
      responseData,
      'req_12345',
      {
        url: 'https://sandbox-api.iyzipay.com/v2/subscription/products',
        method: 'POST',
      }
    );

    const isSandbox = isSandboxLimitationError(
      apiError,
      true,
      '/v2/subscription/products'
    );

    expect(isSandbox).toBe(true);
  });

  test('should not detect sandbox error if not in sandbox mode', () => {
    const responseData: IyzicoApiErrorResponse = {
      status: 'failure',
      errorCode: '100001',
      errorMessage: 'Sistem hatası',
    };

    const apiError = new IyzicoApiError('Sistem hatası', 422, responseData);

    const isSandbox = isSandboxLimitationError(
      apiError,
      false, // Not in sandbox mode
      '/v2/subscription/products'
    );

    expect(isSandbox).toBe(false);
  });

  test('should not detect sandbox error for different error code', () => {
    const responseData: IyzicoApiErrorResponse = {
      status: 'failure',
      errorCode: '201051', // Different error code (plan already exists)
      errorMessage: 'Ödeme planı zaten var.',
    };

    const apiError = new IyzicoApiError(
      'Ödeme planı zaten var.',
      422,
      responseData
    );

    const isSandbox = isSandboxLimitationError(
      apiError,
      true,
      '/v2/subscription/products'
    );

    expect(isSandbox).toBe(false);
  });

  test('should not detect sandbox error for non-subscription paths', () => {
    const responseData: IyzicoApiErrorResponse = {
      status: 'failure',
      errorCode: '100001',
      errorMessage: 'Sistem hatası',
    };

    const apiError = new IyzicoApiError(
      'Sistem hatası',
      422,
      responseData,
      'req_12345',
      {
        url: 'https://sandbox-api.iyzipay.com/payment/bin/check',
        method: 'POST',
      }
    );

    const isSandbox = isSandboxLimitationError(
      apiError,
      true,
      '/payment/bin/check' // Not a subscription path
    );

    expect(isSandbox).toBe(false);
  });

  test('should not detect for different status code', () => {
    const responseData: IyzicoApiErrorResponse = {
      status: 'failure',
      errorCode: '100001',
      errorMessage: 'Sistem hatası',
    };

    const apiError = new IyzicoApiError(
      'Sistem hatası',
      404, // Different status code
      responseData
    );

    const isSandbox = isSandboxLimitationError(
      apiError,
      true,
      '/v2/subscription/products'
    );

    expect(isSandbox).toBe(false);
  });

  test('should handle non-API errors gracefully', () => {
    const networkError = new IyzicoNetworkError('Network failed');

    const isSandbox = isSandboxLimitationError(
      networkError,
      true,
      '/v2/subscription/products'
    );

    expect(isSandbox).toBe(false);
  });

  test('should handle undefined path', () => {
    const responseData: IyzicoApiErrorResponse = {
      status: 'failure',
      errorCode: '100001',
      errorMessage: 'Sistem hatası',
    };

    const apiError = new IyzicoApiError('Sistem hatası', 422, responseData);

    const isSandbox = isSandboxLimitationError(
      apiError,
      true
      // No path provided
    );

    expect(isSandbox).toBe(false);
  });
});

describe('IyzicoConfigError', () => {
  test('should create config error', () => {
    const error = new IyzicoConfigError('Invalid API key', 'apiKey');

    expect(error.message).toBe('Invalid API key');
    expect(error.configField).toBe('apiKey');
  });

  test('should create config error without field', () => {
    const error = new IyzicoConfigError('Config validation failed');

    expect(error.message).toBe('Config validation failed');
    expect(error.configField).toBeUndefined();
  });

  test('should create proper JSON representation', () => {
    const error = new IyzicoConfigError('Invalid timeout', 'timeout');

    const json = error.toJSON();
    expect(json).toEqual({
      name: 'IyzicoConfigError',
      message: 'Invalid timeout',
      requestId: undefined,
      stack: expect.any(String),
      configField: 'timeout',
    });
  });
});

describe('IyzicoErrorUtils', () => {
  describe('type checking methods', () => {
    test('should correctly identify Iyzico errors', () => {
      const iyzicoError = new (class extends IyzicoError {})('test');
      const apiError = new IyzicoApiError('test', 400, {});
      const networkError = new IyzicoNetworkError('test');
      const configError = new IyzicoConfigError('test');
      const regularError = new Error('test');

      expect(IyzicoErrorUtils.isIyzicoError(iyzicoError)).toBe(true);
      expect(IyzicoErrorUtils.isIyzicoError(apiError)).toBe(true);
      expect(IyzicoErrorUtils.isIyzicoError(networkError)).toBe(true);
      expect(IyzicoErrorUtils.isIyzicoError(configError)).toBe(true);
      expect(IyzicoErrorUtils.isIyzicoError(regularError)).toBe(false);
      expect(IyzicoErrorUtils.isIyzicoError('string')).toBe(false);
    });

    test('should correctly identify API errors', () => {
      const apiError = new IyzicoApiError('test', 400, {});
      const networkError = new IyzicoNetworkError('test');
      const regularError = new Error('test');

      expect(IyzicoErrorUtils.isApiError(apiError)).toBe(true);
      expect(IyzicoErrorUtils.isApiError(networkError)).toBe(false);
      expect(IyzicoErrorUtils.isApiError(regularError)).toBe(false);
    });

    test('should correctly identify network errors', () => {
      const networkError = new IyzicoNetworkError('test');
      const apiError = new IyzicoApiError('test', 400, {});
      const regularError = new Error('test');

      expect(IyzicoErrorUtils.isNetworkError(networkError)).toBe(true);
      expect(IyzicoErrorUtils.isNetworkError(apiError)).toBe(false);
      expect(IyzicoErrorUtils.isNetworkError(regularError)).toBe(false);
    });

    test('should correctly identify config errors', () => {
      const configError = new IyzicoConfigError('test');
      const apiError = new IyzicoApiError('test', 400, {});
      const regularError = new Error('test');

      expect(IyzicoErrorUtils.isConfigError(configError)).toBe(true);
      expect(IyzicoErrorUtils.isConfigError(apiError)).toBe(false);
      expect(IyzicoErrorUtils.isConfigError(regularError)).toBe(false);
    });
  });

  describe('getUserFriendlyMessage', () => {
    test('should get user-friendly message from API error', () => {
      const apiError = new IyzicoApiError('test', 400, {
        errorCode: '11',
        errorMessage: 'Invalid request',
      });
      const message = IyzicoErrorUtils.getUserFriendlyMessage(apiError);
      expect(message).toBe('Invalid request');
    });

    test('should get user-friendly message from network timeout error', () => {
      const networkError = new IyzicoNetworkError(
        'timeout',
        new Error('timeout')
      );
      const message = IyzicoErrorUtils.getUserFriendlyMessage(networkError);
      expect(message).toBe('Request timed out. Please try again.');
    });

    test('should get user-friendly message from network error', () => {
      const networkError = new IyzicoNetworkError(
        'network failed',
        new Error('failed')
      );
      const message = IyzicoErrorUtils.getUserFriendlyMessage(networkError);
      expect(message).toBe(
        'Network error occurred. Please check your connection and try again.'
      );
    });

    test('should get user-friendly message from config error', () => {
      const configError = new IyzicoConfigError('invalid config');
      const message = IyzicoErrorUtils.getUserFriendlyMessage(configError);
      expect(message).toBe(
        'Service configuration error. Please contact support.'
      );
    });

    test('should get user-friendly message from generic Iyzico error', () => {
      const iyzicoError = new (class extends IyzicoError {})('test');
      const message = IyzicoErrorUtils.getUserFriendlyMessage(iyzicoError);
      expect(message).toBe('An error occurred while processing your request.');
    });

    test('should get user-friendly message from regular error', () => {
      const error = new Error('test');
      const message = IyzicoErrorUtils.getUserFriendlyMessage(error);
      expect(message).toBe(
        'An unexpected error occurred. Please try again later.'
      );
    });

    test('should handle unknown error types', () => {
      const message = IyzicoErrorUtils.getUserFriendlyMessage('string error');
      expect(message).toBe('An unknown error occurred.');
    });
  });

  describe('isRetryable', () => {
    test('should identify retryable API errors', () => {
      const retryableError = new IyzicoApiError('server error', 500, {});
      const nonRetryableError = new IyzicoApiError('validation error', 400, {});

      expect(IyzicoErrorUtils.isRetryable(retryableError)).toBe(true);
      expect(IyzicoErrorUtils.isRetryable(nonRetryableError)).toBe(false);
    });

    test('should identify network errors as retryable', () => {
      const networkError = new IyzicoNetworkError('network failed');
      expect(IyzicoErrorUtils.isRetryable(networkError)).toBe(true);
    });

    test('should identify config errors as non-retryable', () => {
      const configError = new IyzicoConfigError('invalid config');
      expect(IyzicoErrorUtils.isRetryable(configError)).toBe(false);
    });

    test('should identify regular errors as non-retryable', () => {
      const error = new Error('test');
      expect(IyzicoErrorUtils.isRetryable(error)).toBe(false);
    });
  });

  describe('getErrorCategory', () => {
    test('should get category from API error', () => {
      const apiError = new IyzicoApiError('auth error', 401, {});
      expect(IyzicoErrorUtils.getErrorCategory(apiError)).toBe(
        ErrorCategory.AUTHENTICATION
      );
    });

    test('should get category from network error', () => {
      const networkError = new IyzicoNetworkError('network error');
      expect(IyzicoErrorUtils.getErrorCategory(networkError)).toBe(
        ErrorCategory.NETWORK
      );
    });

    test('should get category from config error', () => {
      const configError = new IyzicoConfigError('config error');
      expect(IyzicoErrorUtils.getErrorCategory(configError)).toBe(
        ErrorCategory.CONFIGURATION
      );
    });

    test('should return unknown for other errors', () => {
      const error = new Error('test');
      expect(IyzicoErrorUtils.getErrorCategory(error)).toBe(
        ErrorCategory.UNKNOWN
      );
    });
  });

  describe('getErrorSeverity', () => {
    test('should get severity from API error', () => {
      const apiError = new IyzicoApiError('server error', 500, {});
      expect(IyzicoErrorUtils.getErrorSeverity(apiError)).toBe(
        ErrorSeverity.HIGH
      );
    });

    test('should get severity from network timeout error', () => {
      const timeoutError = new IyzicoNetworkError(
        'timeout',
        new Error('timeout')
      );
      expect(IyzicoErrorUtils.getErrorSeverity(timeoutError)).toBe(
        ErrorSeverity.MEDIUM
      );
    });

    test('should get severity from network error', () => {
      const networkError = new IyzicoNetworkError('network failed');
      expect(IyzicoErrorUtils.getErrorSeverity(networkError)).toBe(
        ErrorSeverity.HIGH
      );
    });

    test('should get severity from config error', () => {
      const configError = new IyzicoConfigError('config error');
      expect(IyzicoErrorUtils.getErrorSeverity(configError)).toBe(
        ErrorSeverity.CRITICAL
      );
    });

    test('should return medium severity for unknown errors', () => {
      const error = new Error('test');
      expect(IyzicoErrorUtils.getErrorSeverity(error)).toBe(
        ErrorSeverity.MEDIUM
      );
    });
  });

  describe('formatForLogging', () => {
    test('should format Iyzico error for logging', () => {
      const apiError = new IyzicoApiError(
        'API error',
        400,
        {
          errorCode: '12',
          errorMessage: 'Card number is invalid',
          cardNumber: '1234567890123456',
        },
        'req_12345'
      );

      const formatted = IyzicoErrorUtils.formatForLogging(apiError);
      expect(formatted).toEqual({
        name: 'IyzicoApiError',
        message: 'API error',
        requestId: 'req_12345',
        stack: expect.any(String),
        statusCode: 400,
        errorCode: '12',
        errorGroup: undefined,
        responseData: {
          errorCode: '12',
          errorMessage: 'Card number is invalid',
        }, // cardNumber removed
        url: undefined,
        method: undefined,
        isRetryable: false,
        isClientError: true,
        isServerError: false,
        userFriendlyMessage: 'Card number is invalid',
        category: ErrorCategory.VALIDATION,
        severity: ErrorSeverity.LOW,
      });
    });

    test('should format regular error for logging', () => {
      const error = new Error('Test error');
      const formatted = IyzicoErrorUtils.formatForLogging(error);

      expect(formatted).toEqual({
        name: 'Error',
        message: 'Test error',
        stack: expect.any(String),
      });
    });

    test('should format unknown error for logging', () => {
      const formatted = IyzicoErrorUtils.formatForLogging('string error');

      expect(formatted).toEqual({
        error: 'string error',
        type: 'string',
      });
    });

    test('should remove sensitive data from response data', () => {
      const responseData = {
        errorCode: 'TEST_ERROR',
        authToken: 'sensitive-token',
        apiKey: 'sensitive-api-key',
        secretKey: 'sensitive-secret',
        cardNumber: '1234567890123456',
        cvv: '123',
        normalField: 'normal-value',
      };

      const apiError = new IyzicoApiError('Test', 400, responseData);
      const formatted = IyzicoErrorUtils.formatForLogging(apiError);

      expect(formatted.responseData).toEqual({
        errorCode: 'TEST_ERROR',
        normalField: 'normal-value',
        // Sensitive fields should be removed
      });
    });
  });
});

describe('Error Messages Constants', () => {
  test('should have comprehensive error messages', () => {
    expect(IYZICO_ERROR_MESSAGES).toBeDefined();
    expect(typeof IYZICO_ERROR_MESSAGES).toBe('object');
    expect(Object.keys(IYZICO_ERROR_MESSAGES).length).toBeGreaterThan(0);

    // Check some key numeric error codes exist (these are what Iyzico actually returns)
    expect(IYZICO_ERROR_MESSAGES['1']).toBeDefined();
    expect(IYZICO_ERROR_MESSAGES['11']).toBeDefined();
    expect(IYZICO_ERROR_MESSAGES['1000']).toBeDefined();
    expect(IYZICO_ERROR_MESSAGES['5001']).toBeDefined();
  });

  test('should have user-friendly messages', () => {
    // All messages should be user-friendly strings
    Object.values(IYZICO_ERROR_MESSAGES).forEach((message) => {
      expect(typeof message).toBe('string');
      expect(message.length).toBeGreaterThan(0);
      // Should not contain low-level technical jargon (HTTP/JSON/null/undefined are too technical)
      // Note: "API" is acceptable in auth/config errors as it's part of the domain language
      expect(message).not.toMatch(/HTTP|JSON|null|undefined/i);
    });
  });
});

describe('Business Constraint Error Detection', () => {
  test('should detect business constraint error (404 + errorCode "1")', () => {
    const error = new IyzicoApiError(
      'System error',
      404,
      { errorCode: '1', errorMessage: 'System error' },
      'req_123',
      { method: 'DELETE', url: '/v2/subscription/pricing-plans/abc' }
    );

    expect(error.isBusinessConstraintError()).toBe(true);
    expect(error.isNotFoundError()).toBe(false);
  });

  test('should detect real not found error (404 without errorCode "1")', () => {
    const error = new IyzicoApiError('Not found', 404, {
      errorCode: '404',
      errorMessage: 'Resource not found',
    });

    expect(error.isNotFoundError()).toBe(true);
    expect(error.isBusinessConstraintError()).toBe(false);
  });

  test('should detect real not found error (404 with no errorCode)', () => {
    const error = new IyzicoApiError('Not found', 404, {
      errorMessage: 'Resource not found',
    });

    expect(error.isNotFoundError()).toBe(true);
    expect(error.isBusinessConstraintError()).toBe(false);
  });

  test('should provide contextual message for delete operation with DELETE method', () => {
    const error = new IyzicoApiError(
      'System error',
      404,
      { errorCode: '1' },
      'req_123',
      { method: 'DELETE' }
    );

    const message = error.getContextualMessage('plan', 'plan-123');
    expect(message).toContain('Cannot delete plan');
    expect(message).toContain('plan-123');
    expect(message).toContain('active subscriptions');
  });

  test('should provide contextual message for delete operation', () => {
    const error = new IyzicoApiError(
      'System error',
      404,
      { errorCode: '1' },
      'req_123',
      { method: 'POST' }
    );

    const message = error.getContextualMessage('delete', 'resource-123');
    expect(message).toContain('Cannot delete');
    expect(message).toContain('resource-123');
    expect(message).toContain('business');
  });

  test('should provide generic contextual message for non-delete operations', () => {
    const error = new IyzicoApiError(
      'System error',
      404,
      { errorCode: '1' },
      'req_123',
      { method: 'POST' }
    );

    const message = error.getContextualMessage();
    expect(message).toContain('business constraints');
    expect(message).toContain('dependencies');
  });

  test('should provide contextual message for real 404', () => {
    const error = new IyzicoApiError('Not found', 404, { errorCode: '404' });

    const message = error.getContextualMessage();
    expect(message).toContain('Resource not found');
    expect(message).toContain('Verify the ID');
  });

  test('should fall back to user-friendly message for other errors', () => {
    const error = new IyzicoApiError('Validation error', 400, {
      errorCode: 'VALIDATION_ERROR',
    });

    const message = error.getContextualMessage();
    expect(message).toBeTruthy();
  });

  test('should provide helpful suggestions for business constraints with DELETE method', () => {
    const error = new IyzicoApiError(
      'System error',
      404,
      { errorCode: '1' },
      'req_123',
      { method: 'DELETE' }
    );

    const suggestion = error.getSuggestion('delete');
    expect(suggestion).toContain('active subscriptions');
    expect(suggestion).toContain('cancel subscriptions');
  });

  test('should provide helpful suggestions for business constraints without operation', () => {
    const error = new IyzicoApiError(
      'System error',
      404,
      { errorCode: '1' },
      'req_123',
      { method: 'DELETE' }
    );

    const suggestion = error.getSuggestion();
    expect(suggestion).toContain('subscriptions');
  });

  test('should provide suggestions for real 404 errors', () => {
    const error = new IyzicoApiError('Not found', 404, { errorCode: '404' });

    const suggestion = error.getSuggestion('plan');
    expect(suggestion).toContain('Verify');
    expect(suggestion).toContain('plan');
  });

  test('should provide suggestions for auth errors', () => {
    const error = new IyzicoApiError('Unauthorized', 401, {});

    const suggestion = error.getSuggestion();
    expect(suggestion).toContain('credentials');
  });

  test('should provide suggestions for retryable errors', () => {
    const error = new IyzicoApiError('Server error', 500, {});

    const suggestion = error.getSuggestion();
    expect(suggestion).toContain('temporary');
  });

  test('should provide generic suggestions for other errors', () => {
    const error = new IyzicoApiError('Validation error', 400, {});

    const suggestion = error.getSuggestion();
    expect(suggestion).toContain('error details');
  });
});

describe('New Error Code Mappings', () => {
  test('should have general error code mappings', () => {
    expect(IYZICO_ERROR_MESSAGES['1']).toBeDefined();
    expect(IYZICO_ERROR_MESSAGES['11']).toBeDefined();
    expect(IYZICO_ERROR_MESSAGES['27']).toBeDefined();
    expect(IYZICO_ERROR_MESSAGES['1']).toBe('System error occurred');
    expect(IYZICO_ERROR_MESSAGES['11']).toBe('Invalid request');
  });

  test('should have authentication error code mappings', () => {
    expect(IYZICO_ERROR_MESSAGES['1000']).toBeDefined();
    expect(IYZICO_ERROR_MESSAGES['1001']).toBeDefined();
    expect(IYZICO_ERROR_MESSAGES['1009']).toBeDefined();
    expect(IYZICO_ERROR_MESSAGES['1000']).toContain('signature');
    expect(IYZICO_ERROR_MESSAGES['1001']).toContain('credentials');
  });

  test('should have validation error code mappings', () => {
    expect(IYZICO_ERROR_MESSAGES['5001']).toBeDefined();
    expect(IYZICO_ERROR_MESSAGES['5002']).toBeDefined();
    expect(IYZICO_ERROR_MESSAGES['5111']).toBeDefined();
  });
});

describe('IyzicoErrorUtils extended methods', () => {
  test('should detect business constraint errors', () => {
    const error = new IyzicoApiError('System error', 404, { errorCode: '1' });
    expect(IyzicoErrorUtils.isBusinessConstraintError(error)).toBe(true);
  });

  test('should not detect non-business constraint errors', () => {
    const error = new IyzicoApiError('Not found', 404, { errorCode: '404' });
    expect(IyzicoErrorUtils.isBusinessConstraintError(error)).toBe(false);
  });

  test('should not detect business constraint for non-API errors', () => {
    const error = new IyzicoNetworkError('Network error');
    expect(IyzicoErrorUtils.isBusinessConstraintError(error)).toBe(false);
  });

  test('should detect not found errors', () => {
    const error = new IyzicoApiError('Not found', 404, { errorCode: '404' });
    expect(IyzicoErrorUtils.isNotFoundError(error)).toBe(true);
  });

  test('should not detect not found for business constraints', () => {
    const error = new IyzicoApiError('System error', 404, { errorCode: '1' });
    expect(IyzicoErrorUtils.isNotFoundError(error)).toBe(false);
  });

  test('should get contextual message', () => {
    const error = new IyzicoApiError('System error', 404, { errorCode: '1' });
    const message = IyzicoErrorUtils.getContextualMessage(
      error,
      'plan',
      'plan-123'
    );
    expect(message).toContain('business constraints');
  });

  test('should get contextual message for non-API errors', () => {
    const error = new IyzicoNetworkError('Network error');
    const message = IyzicoErrorUtils.getContextualMessage(error);
    expect(message).toBeTruthy();
  });

  test('should get suggestion', () => {
    const error = new IyzicoApiError('System error', 404, { errorCode: '1' });
    const suggestion = IyzicoErrorUtils.getSuggestion(error, 'delete');
    expect(suggestion).toBeDefined();
    expect(suggestion.length).toBeGreaterThan(0);
  });

  test('should get suggestion for non-API errors', () => {
    const error = new Error('Generic error');
    const suggestion = IyzicoErrorUtils.getSuggestion(error);
    expect(suggestion).toBe(
      'An unexpected error occurred. Please try again later.'
    );
  });
});