import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import {
  IYZICO_BASE_URL,
  IYZICO_SANDBOX_BASE_URL,
  IyzicoApiError,
  IyzicoClient,
  IyzicoConfigError,
  IyzicoError,
  IyzicoNetworkError,
} from '../src/client';

// Mock fetch globally
const mockFetch = vi.fn<typeof fetch>();
globalThis.fetch = mockFetch;
const fetchMock = mockFetch;

describe('IyzicoClient', () => {
  let client: IyzicoClient;
  const validOptions = {
    apiKey: 'test-api-key',
    secretKey: 'test-secret-key',
    debug: false,
  };

  beforeEach(() => {
    client = new IyzicoClient(validOptions);
    fetchMock.mockClear();
  });

  afterEach(() => {
    fetchMock.mockReset();
    vi.clearAllMocks();
  });

  describe('initialization', () => {
    test('should initialize with valid options', () => {
      expect(client).toBeInstanceOf(IyzicoClient);
      expect(client.products).toBeDefined();
      expect(client.plans).toBeDefined();
      expect(client.checkout).toBeDefined();
      expect(client.subscriptions).toBeDefined();
      expect(client.health).toBeDefined();
    });

    test('should throw IyzicoConfigError with empty API key', () => {
      expect(
        () =>
          new IyzicoClient({
            apiKey: '',
            secretKey: 'test-secret',
          })
      ).toThrow('Iyzico API Key is required and cannot be empty.');

      expect(
        () =>
          new IyzicoClient({
            apiKey: '',
            secretKey: 'test-secret',
          })
      ).toThrowError(IyzicoConfigError);
    });

    test('should throw IyzicoConfigError with empty secret key', () => {
      expect(
        () =>
          new IyzicoClient({
            apiKey: 'test-api',
            secretKey: '',
          })
      ).toThrow('Iyzico Secret Key is required and cannot be empty.');

      expect(
        () =>
          new IyzicoClient({
            apiKey: 'test-api',
            secretKey: '',
          })
      ).toThrowError(IyzicoConfigError);
    });

    test('should set default options for production', () => {
      const config = client.getConfig();
      expect(config.baseUrl).toBe(IYZICO_BASE_URL);
      expect(config.timeout).toBe(30000);
      expect(config.maxRetries).toBe(3);
      expect(config.debug).toBe(false);
      expect(config.isSandbox).toBe(false);
      expect(config.environment).toBe('production');
    });

    test('should use sandbox URL when isSandbox is true', () => {
      const sandboxClient = new IyzicoClient({
        ...validOptions,
        isSandbox: true,
        sandboxApiKey: 'test-sandbox-api',
        sandboxSecretKey: 'test-sandbox-secret',
      });

      const config = sandboxClient.getConfig();
      expect(config.baseUrl).toBe(IYZICO_SANDBOX_BASE_URL);
      expect(config.isSandbox).toBe(true);
      expect(config.environment).toBe('sandbox');
    });

    test('should allow custom baseUrl to override sandbox URL', () => {
      const customClient = new IyzicoClient({
        ...validOptions,
        isSandbox: true,
        sandboxApiKey: 'test-sandbox-api',
        sandboxSecretKey: 'test-sandbox-secret',
        baseUrl: IYZICO_SANDBOX_BASE_URL,
      });

      const config = customClient.getConfig();
      expect(config.baseUrl).toBe(IYZICO_SANDBOX_BASE_URL);
      expect(config.isSandbox).toBe(true);
      expect(config.environment).toBe('sandbox');
    });

    test('should accept custom options', () => {
      const customClient = new IyzicoClient({
        ...validOptions,
        baseUrl: IYZICO_BASE_URL,
        timeout: 10000,
        maxRetries: 1,
        debug: true,
      });

      const config = customClient.getConfig();
      expect(config.baseUrl).toBe(IYZICO_BASE_URL);
      expect(config.timeout).toBe(10000);
      expect(config.maxRetries).toBe(1);
      expect(config.debug).toBe(true);
    });

    test('should validate timeout minimum and throw IyzicoConfigError', () => {
      expect(
        () =>
          new IyzicoClient({
            ...validOptions,
            timeout: 500,
          })
      ).toThrow('Timeout must be at least 1000ms (1 second).');

      expect(
        () =>
          new IyzicoClient({
            ...validOptions,
            timeout: 500,
          })
      ).toThrowError(IyzicoConfigError);
    });

    test('should validate maxRetries range and throw IyzicoConfigError', () => {
      expect(
        () =>
          new IyzicoClient({
            ...validOptions,
            maxRetries: -1,
          })
      ).toThrow('maxRetries must be between 0 and 10.');

      expect(
        () =>
          new IyzicoClient({
            ...validOptions,
            maxRetries: -1,
          })
      ).toThrowError(IyzicoConfigError);

      expect(
        () =>
          new IyzicoClient({
            ...validOptions,
            maxRetries: 11,
          })
      ).toThrow('maxRetries must be between 0 and 10.');

      expect(
        () =>
          new IyzicoClient({
            ...validOptions,
            maxRetries: 11,
          })
      ).toThrowError(IyzicoConfigError);
    });

    test('should validate baseUrl format and throw IyzicoConfigError', () => {
      expect(
        () =>
          new IyzicoClient({
            ...validOptions,
            baseUrl: 'invalid-url',
          })
      ).toThrow('Invalid baseUrl provided. Must be a valid URL.');

      expect(
        () =>
          new IyzicoClient({
            ...validOptions,
            baseUrl: 'invalid-url',
          })
      ).toThrowError(IyzicoConfigError);
    });

    test('should throw IyzicoConfigError when sandbox mode is enabled but sandbox API key is missing', () => {
      expect(
        () =>
          new IyzicoClient({
            ...validOptions,
            isSandbox: true,
            sandboxSecretKey: 'test-sandbox-secret',
            // sandboxApiKey is missing
          })
      ).toThrow(
        'Iyzico Sandbox API Key is required when isSandbox is enabled.'
      );

      expect(
        () =>
          new IyzicoClient({
            ...validOptions,
            isSandbox: true,
            sandboxSecretKey: 'test-sandbox-secret',
          })
      ).toThrowError(IyzicoConfigError);
    });

    test('should throw IyzicoConfigError when sandbox mode is enabled but sandbox secret key is missing', () => {
      expect(
        () =>
          new IyzicoClient({
            ...validOptions,
            isSandbox: true,
            sandboxApiKey: 'test-sandbox-api',
            // sandboxSecretKey is missing
          })
      ).toThrow(
        'Iyzico Sandbox Secret Key is required when isSandbox is enabled.'
      );

      expect(
        () =>
          new IyzicoClient({
            ...validOptions,
            isSandbox: true,
            sandboxApiKey: 'test-sandbox-api',
          })
      ).toThrowError(IyzicoConfigError);
    });

    test('should throw IyzicoConfigError when sandbox mode is enabled but both sandbox keys are missing', () => {
      expect(
        () =>
          new IyzicoClient({
            ...validOptions,
            isSandbox: true,
            // both sandbox keys are missing
          })
      ).toThrow(
        'Iyzico Sandbox API Key is required when isSandbox is enabled.'
      );

      expect(
        () =>
          new IyzicoClient({
            ...validOptions,
            isSandbox: true,
          })
      ).toThrowError(IyzicoConfigError);
    });

    test('should successfully initialize with sandbox credentials when sandbox mode is enabled', () => {
      const sandboxClient = new IyzicoClient({
        ...validOptions,
        isSandbox: true,
        sandboxApiKey: 'test-sandbox-api',
        sandboxSecretKey: 'test-sandbox-secret',
      });

      expect(sandboxClient).toBeInstanceOf(IyzicoClient);
      const config = sandboxClient.getConfig();
      expect(config.isSandbox).toBe(true);
      expect(config.environment).toBe('sandbox');
    });

    test('should not require sandbox credentials when sandbox mode is disabled', () => {
      const productionClient = new IyzicoClient({
        ...validOptions,
        isSandbox: false,
        // no sandbox keys provided - should be fine
      });

      expect(productionClient).toBeInstanceOf(IyzicoClient);
      const config = productionClient.getConfig();
      expect(config.isSandbox).toBe(false);
      expect(config.environment).toBe('production');
    });
  });

  describe('request method', () => {
    test('should make successful GET request to production', async () => {
      const mockResponse = { status: 'success', data: { id: '123' } };
      fetchMock.mockResolvedValue(
        new Response(JSON.stringify(mockResponse), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        })
      );

      const result = await client.request({
        path: '/test',
        method: 'GET',
      });

      expect(result).toEqual(mockResponse);
      expect(fetchMock).toHaveBeenCalledOnce();

      const [url, options] = fetchMock.mock.calls[0] as [
        string,
        RequestInit | undefined,
      ];
      expect(url).toBe(IYZICO_BASE_URL + '/test');
      expect(options?.method).toBe('GET');
      expect(options?.body).toBe(null);
    });

    test('should make successful GET request to sandbox', async () => {
      const sandboxClient = new IyzicoClient({
        ...validOptions,
        isSandbox: true,
        sandboxApiKey: 'test-sandbox-api',
        sandboxSecretKey: 'test-sandbox-secret',
      });

      const mockResponse = { status: 'success', data: { id: '123' } };
      fetchMock.mockResolvedValue(
        new Response(JSON.stringify(mockResponse), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        })
      );

      const result = await sandboxClient.request({
        path: '/test',
        method: 'GET',
      });

      expect(result).toEqual(mockResponse);
      expect(fetchMock).toHaveBeenCalledOnce();

      const [url, options] = fetchMock.mock.calls[0] as [
        string,
        RequestInit | undefined,
      ];
      expect(url).toBe('https://sandbox-merchant.iyzipay.com/test');
      expect(options?.method).toBe('GET');
      expect(options?.body).toBe(null);
    });

    test('should make successful POST request with body', async () => {
      const mockResponse = { status: 'success', data: { id: '123' } };
      const requestBody = { name: 'Test Product' };

      fetchMock.mockResolvedValue(
        new Response(JSON.stringify(mockResponse), {
          status: 201,
          headers: { 'content-type': 'application/json' },
        })
      );

      const result = await client.request({
        path: '/test',
        method: 'POST',
        body: requestBody,
      });

      expect(result).toEqual(mockResponse);
      expect(fetchMock).toHaveBeenCalledOnce();

      const [, options] = fetchMock.mock.calls[0] as [
        string,
        RequestInit | undefined,
      ];
      expect(options?.method).toBe('POST');
      expect(options?.body).toBe(JSON.stringify(requestBody));
    });

    test('should throw IyzicoApiError with enhanced context on 4xx response', async () => {
      const mockErrorResponse = {
        status: 'failure',
        errorMessage: 'Invalid BIN number format',
        errorCode: 'INVALID_BIN',
        errorGroup: 'VALIDATION_ERROR',
      };

      fetchMock.mockResolvedValue(
        new Response(JSON.stringify(mockErrorResponse), {
          status: 400,
          headers: { 'content-type': 'application/json' },
        })
      );

      try {
        await client.request({
          path: '/payment/bin/check',
          method: 'POST',
          body: { binNumber: '123456' },
        });
        throw new Error('Expected error was not thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(IyzicoApiError);

        const apiError = error as IyzicoApiError;
        expect(apiError.message).toBe('Invalid BIN number format');
        expect(apiError.statusCode).toBe(400);
        expect(apiError.errorCode).toBe('INVALID_BIN');
        expect(apiError.errorGroup).toBe('VALIDATION_ERROR');
        expect(apiError.url).toBe('https://api.iyzipay.com/payment/bin/check');
        expect(apiError.method).toBe('POST');
        expect(apiError.requestId).toMatch(/^req_\d+_[a-z0-9]{9}$/);
        expect(apiError.responseData).toEqual(mockErrorResponse);

        // Test enhanced methods
        expect(apiError.getUserFriendlyMessage()).toBe(
          'Invalid card number format'
        );
        expect(apiError.isRetryable()).toBe(false);
        expect(apiError.isClientError()).toBe(true);
        expect(apiError.isServerError()).toBe(false);

        // Test formatted message
        expect(apiError.getFormattedMessage()).toContain(
          '[400] Invalid BIN number format'
        );
        expect(apiError.getFormattedMessage()).toContain('Code: INVALID_BIN');
        expect(apiError.getFormattedMessage()).toContain(
          'Group: VALIDATION_ERROR'
        );
        expect(apiError.getFormattedMessage()).toMatch(
          /Request ID: req_\d+_[a-z0-9]{9}/
        );

        // Test JSON representation
        const json = apiError.toJSON();
        expect(json).toMatchObject({
          name: 'IyzicoApiError',
          message: 'Invalid BIN number format',
          statusCode: 400,
          errorCode: 'INVALID_BIN',
          errorGroup: 'VALIDATION_ERROR',
          url: 'https://api.iyzipay.com/payment/bin/check',
          method: 'POST',
          userFriendlyMessage: 'Invalid card number format',
          isRetryable: false,
          isClientError: true,
          isServerError: false,
        });
      }
    });

    test('should retry on 5xx errors', async () => {
      const mockErrorResponse = { errorMessage: 'Internal Server Error' };
      const mockSuccessResponse = { status: 'success', data: { id: '123' } };

      // First call fails with 500, second succeeds
      fetchMock
        .mockResolvedValueOnce(
          new Response(JSON.stringify(mockErrorResponse), {
            status: 500,
            headers: { 'content-type': 'application/json' },
          })
        )
        .mockResolvedValueOnce(
          new Response(JSON.stringify(mockSuccessResponse), {
            status: 200,
            headers: { 'content-type': 'application/json' },
          })
        );

      const result = await client.request({
        path: '/test',
        method: 'GET',
      });

      expect(result).toEqual(mockSuccessResponse);
      expect(fetchMock).toHaveBeenCalledTimes(2);
    });

    test('should handle timeout errors with enhanced context', async () => {
      const shortTimeoutClient = new IyzicoClient({
        ...validOptions,
        timeout: 1000,
      });

      // Mock a slow response that respects AbortController
      fetchMock.mockImplementation(
        (input: string | URL | Request, init?: RequestInit) =>
          new Promise<Response>((resolve, reject) => {
            const timeout = setTimeout(() => {
              resolve(new Response('{"success": true}'));
            }, 2000);

            // Respect AbortController
            if (init?.signal) {
              init.signal.addEventListener('abort', () => {
                clearTimeout(timeout);
                reject(
                  new DOMException('The operation was aborted.', 'AbortError')
                );
              });
            }
          })
      );

      try {
        await shortTimeoutClient.request({
          path: '/test',
          method: 'GET',
        });
        throw new Error('Expected timeout error was not thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(IyzicoNetworkError);

        const networkError = error as IyzicoNetworkError;
        expect(networkError.message).toBe('Request timeout after 1000ms');
        expect(networkError.isTimeout).toBe(true);
        expect(networkError.cause).toBeInstanceOf(DOMException);
        expect(networkError.requestId).toMatch(/^req_\d+_[a-z0-9]{9}$/);

        // Test JSON representation
        const json = networkError.toJSON();
        expect(json).toMatchObject({
          name: 'IyzicoNetworkError',
          message: 'Request timeout after 1000ms',
          isTimeout: true,
          cause: {
            name: expect.any(String), // Could be 'DOMException' or 'AbortError' depending on environment
            message: 'The operation was aborted.',
          },
        });
        expect(json.requestId).toMatch(/^req_\d+_[a-z0-9]{9}$/);
      }
    });

    test('should handle network errors', async () => {
      fetchMock.mockRejectedValue(new TypeError('Failed to fetch'));

      await expect(
        client.request({
          path: '/test',
          method: 'GET',
        })
      ).rejects.toThrow(IyzicoNetworkError);

      await expect(
        client.request({
          path: '/test',
          method: 'GET',
        })
      ).rejects.toThrow('Network error: Unable to connect to Iyzico API');
    });

    test('should handle non-JSON responses', async () => {
      fetchMock.mockResolvedValue(
        new Response('Plain text response', {
          status: 200,
          headers: { 'content-type': 'text/plain' },
        })
      );

      const result = await client.request({
        path: '/test',
        method: 'GET',
      });

      expect(result).toEqual({ rawResponse: 'Plain text response' });
    });

    test('should include request ID in headers', async () => {
      fetchMock.mockResolvedValue(
        new Response('{"success": true}', {
          status: 200,
          headers: { 'content-type': 'application/json' },
        })
      );

      await client.request({
        path: '/test',
        method: 'GET',
      });

      const [, options] = fetchMock.mock.calls[0] as [
        string,
        RequestInit | undefined,
      ];
      const headers = options?.headers as Record<string, string>;

      expect(headers['X-Request-ID']).toMatch(/^req_\d+_[a-z0-9]{9}$/);
    });

    test('should throw IyzicoConfigError when sandbox mode enabled but sandbox credentials missing at request time', async () => {
      // Create a client that bypasses constructor validation by creating with production settings
      // then manually setting isSandbox to true (simulating runtime configuration change)
      const testClient = new IyzicoClient({
        ...validOptions,
        isSandbox: false, // Start with production mode
      });

      // Manually modify the internal options to simulate sandbox mode being enabled without proper credentials
      // Type assertion needed for testing internal state
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (testClient as any).options.isSandbox = true;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (testClient as any).options.sandboxApiKey = undefined;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (testClient as any).options.sandboxSecretKey = undefined;

      await expect(
        testClient.request({
          path: '/test',
          method: 'GET',
        })
      ).rejects.toThrow(
        'Sandbox mode is enabled but sandbox credentials are missing. Provide sandboxApiKey and sandboxSecretKey.'
      );

      await expect(
        testClient.request({
          path: '/test',
          method: 'GET',
        })
      ).rejects.toThrowError(IyzicoConfigError);
    });
  });

  describe('error classes', () => {
    describe('IyzicoApiError', () => {
      test('should format message correctly with all details', () => {
        const error = new IyzicoApiError(
          'Test error',
          400,
          { errorCode: 'TEST_ERROR', errorGroup: 'VALIDATION' },
          'req_123',
          { url: 'https://api.iyzipay.com/test', method: 'POST' }
        );

        expect(error.name).toBe('IyzicoApiError');
        expect(error.message).toBe('Test error');
        expect(error.statusCode).toBe(400);
        expect(error.requestId).toBe('req_123');
        expect(error.errorCode).toBe('TEST_ERROR');
        expect(error.errorGroup).toBe('VALIDATION');
        expect(error.url).toBe('https://api.iyzipay.com/test');
        expect(error.method).toBe('POST');
        expect(error.getFormattedMessage()).toBe(
          '[400] Test error | Code: TEST_ERROR | Group: VALIDATION | Request ID: req_123'
        );
      });

      test('should provide user-friendly messages for known error codes', () => {
        const binError = new IyzicoApiError(
          'Invalid BIN',
          400,
          { errorCode: 'INVALID_BIN' },
          'req_456'
        );
        expect(binError.getUserFriendlyMessage()).toBe(
          'Invalid card number format'
        );

        const cardError = new IyzicoApiError(
          'Invalid card',
          400,
          { errorCode: 'INVALID_CARD' },
          'req_789'
        );
        expect(cardError.getUserFriendlyMessage()).toBe(
          'Invalid card information'
        );

        const serverError = new IyzicoApiError(
          'Server error',
          500,
          { errorCode: 'UNKNOWN_ERROR' },
          'req_101'
        );
        expect(serverError.getUserFriendlyMessage()).toBe(
          'Service temporarily unavailable. Please try again later.'
        );
      });

      test('should correctly identify error types', () => {
        const clientError = new IyzicoApiError('Client error', 400, {});
        expect(clientError.isClientError()).toBe(true);
        expect(clientError.isServerError()).toBe(false);
        expect(clientError.isRetryable()).toBe(false);

        const serverError = new IyzicoApiError('Server error', 500, {});
        expect(serverError.isClientError()).toBe(false);
        expect(serverError.isServerError()).toBe(true);
        expect(serverError.isRetryable()).toBe(true);

        const rateLimitError = new IyzicoApiError('Too many requests', 429, {});
        expect(rateLimitError.isRetryable()).toBe(true);
      });

      test('should create comprehensive JSON representation', () => {
        const error = new IyzicoApiError(
          'Test error',
          400,
          {
            errorCode: 'TEST_ERROR',
            errorGroup: 'VALIDATION',
            additionalData: 'test',
          },
          'req_123',
          { url: 'https://api.iyzipay.com/test', method: 'POST' }
        );

        const json = error.toJSON();
        expect(json).toMatchObject({
          name: 'IyzicoApiError',
          message: 'Test error',
          requestId: 'req_123',
          statusCode: 400,
          errorCode: 'TEST_ERROR',
          errorGroup: 'VALIDATION',
          url: 'https://api.iyzipay.com/test',
          method: 'POST',
          userFriendlyMessage: expect.any(String),
          isRetryable: false,
          isClientError: true,
          isServerError: false,
          responseData: {
            errorCode: 'TEST_ERROR',
            errorGroup: 'VALIDATION',
            additionalData: 'test',
          },
        });
      });
    });

    describe('IyzicoNetworkError', () => {
      test('should preserve cause and identify timeout errors', () => {
        const originalError = new Error('Original error');
        const networkError = new IyzicoNetworkError(
          'Network error',
          originalError,
          'req_net_123'
        );

        expect(networkError.name).toBe('IyzicoNetworkError');
        expect(networkError.message).toBe('Network error');
        expect(networkError.cause).toBe(originalError);
        expect(networkError.requestId).toBe('req_net_123');
        expect(networkError.isTimeout).toBe(false);
      });

      test('should detect timeout errors', () => {
        const timeoutError = new IyzicoNetworkError(
          'Request timeout after 30000ms',
          new DOMException('The operation was aborted.', 'AbortError'),
          'req_timeout_123'
        );

        expect(timeoutError.isTimeout).toBe(true);
      });

      test('should create JSON representation with cause', () => {
        const originalError = new TypeError('fetch error');
        const networkError = new IyzicoNetworkError(
          'Network error',
          originalError,
          'req_net_456'
        );

        const json = networkError.toJSON();
        expect(json).toMatchObject({
          name: 'IyzicoNetworkError',
          message: 'Network error',
          requestId: 'req_net_456',
          isTimeout: false,
          cause: {
            name: 'TypeError',
            message: 'fetch error',
          },
        });
      });
    });

    describe('IyzicoConfigError', () => {
      test('should store configuration field information', () => {
        const configError = new IyzicoConfigError(
          'Invalid API key format',
          'apiKey'
        );

        expect(configError.name).toBe('IyzicoConfigError');
        expect(configError.message).toBe('Invalid API key format');
        expect(configError.configField).toBe('apiKey');
      });

      test('should create JSON representation', () => {
        const configError = new IyzicoConfigError(
          'Invalid timeout value',
          'timeout'
        );

        const json = configError.toJSON();
        expect(json).toMatchObject({
          name: 'IyzicoConfigError',
          message: 'Invalid timeout value',
          configField: 'timeout',
        });
      });
    });

    test('should test base error class functionality through concrete implementations', () => {
      // Test that all error classes inherit from IyzicoError properly
      const apiError = new IyzicoApiError('API error', 400, {}, 'req_123');
      const networkError = new IyzicoNetworkError(
        'Network error',
        undefined,
        'req_456'
      );
      const configError = new IyzicoConfigError('Config error', 'apiKey');

      // Test inheritance
      expect(apiError).toBeInstanceOf(IyzicoError);
      expect(networkError).toBeInstanceOf(IyzicoError);
      expect(configError).toBeInstanceOf(IyzicoError);

      // Test that all have the base properties
      expect(apiError.name).toBe('IyzicoApiError');
      expect(networkError.name).toBe('IyzicoNetworkError');
      expect(configError.name).toBe('IyzicoConfigError');

      // Test JSON method inheritance
      expect(typeof apiError.toJSON).toBe('function');
      expect(typeof networkError.toJSON).toBe('function');
      expect(typeof configError.toJSON).toBe('function');
    });
  });

  describe('debug logging', () => {
    test('should log requests when debug is enabled', async () => {
      const debugClient = new IyzicoClient({
        ...validOptions,
        debug: true,
      });

      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      fetchMock.mockResolvedValue(
        new Response('{"success": true}', {
          status: 200,
          headers: { 'content-type': 'application/json' },
        })
      );

      await debugClient.request({
        path: '/test',
        method: 'POST',
        body: { test: 'data' },
      });

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('[IyzicoClient] POST'),
        expect.objectContaining({
          requestId: expect.any(String),
          headers: expect.objectContaining({
            Authorization: '[REDACTED]',
          }),
          body: { test: 'data' },
        })
      );

      consoleSpy.mockRestore();
    });

    test('should log sandbox initialization when debug is enabled', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      new IyzicoClient({
        ...validOptions,
        debug: true,
        isSandbox: true,
        sandboxApiKey: 'test-sandbox-api',
        sandboxSecretKey: 'test-sandbox-secret',
      });

      expect(consoleSpy).toHaveBeenCalledWith(
        '[IyzicoClient] Initialized with options:',
        expect.objectContaining({
          baseUrl: 'https://sandbox-merchant.iyzipay.com',
          isSandbox: true,
          environment: 'sandbox',
          apiKey: expect.any(String),
        })
      );

      consoleSpy.mockRestore();
    });
  });
});
