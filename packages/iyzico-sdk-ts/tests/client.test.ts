import { vi, test, expect, describe, afterEach, beforeEach } from 'vitest';
import { IyzicoClient, IyzicoApiError, IyzicoNetworkError } from '../src/client';

// Mock fetch globally
globalThis.fetch = vi.fn();
const fetchMock = globalThis.fetch as any;

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

    test('should throw error with empty API key', () => {
      expect(
        () =>
          new IyzicoClient({
            apiKey: '',
            secretKey: 'test-secret',
          })
      ).toThrow('Iyzico API Key is required and cannot be empty.');
    });

    test('should throw error with empty secret key', () => {
      expect(
        () =>
          new IyzicoClient({
            apiKey: 'test-api',
            secretKey: '',
          })
      ).toThrow('Iyzico Secret Key is required and cannot be empty.');
    });

    test('should set default options for production', () => {
      const config = client.getConfig();
      expect(config.baseUrl).toBe('https://api.iyzipay.com');
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
      });

      const config = sandboxClient.getConfig();
      expect(config.baseUrl).toBe('https://sandbox-merchant.iyzipay.com');
      expect(config.isSandbox).toBe(true);
      expect(config.environment).toBe('sandbox');
    });

    test('should allow custom baseUrl to override sandbox URL', () => {
      const customClient = new IyzicoClient({
        ...validOptions,
        isSandbox: true,
        baseUrl: 'https://custom.sandbox.com',
      });

      const config = customClient.getConfig();
      expect(config.baseUrl).toBe('https://custom.sandbox.com');
      expect(config.isSandbox).toBe(true);
      expect(config.environment).toBe('sandbox');
    });

    test('should accept custom options', () => {
      const customClient = new IyzicoClient({
        ...validOptions,
        baseUrl: 'https://custom.api.com',
        timeout: 10000,
        maxRetries: 1,
        debug: true,
      });

      const config = customClient.getConfig();
      expect(config.baseUrl).toBe('https://custom.api.com');
      expect(config.timeout).toBe(10000);
      expect(config.maxRetries).toBe(1);
      expect(config.debug).toBe(true);
    });

    test('should validate timeout minimum', () => {
      expect(
        () =>
          new IyzicoClient({
            ...validOptions,
            timeout: 500,
          })
      ).toThrow('Timeout must be at least 1000ms (1 second).');
    });

    test('should validate maxRetries range', () => {
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
            maxRetries: 11,
          })
      ).toThrow('maxRetries must be between 0 and 10.');
    });

    test('should validate baseUrl format', () => {
      expect(
        () =>
          new IyzicoClient({
            ...validOptions,
            baseUrl: 'invalid-url',
          })
      ).toThrow('Invalid baseUrl provided. Must be a valid URL.');
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

      const [url, options] = fetchMock.mock.calls[0];
      expect(url).toBe('https://api.iyzipay.com/test');
      expect(options?.method).toBe('GET');
      expect(options?.body).toBe(null);
    });

    test('should make successful GET request to sandbox', async () => {
      const sandboxClient = new IyzicoClient({
        ...validOptions,
        isSandbox: true,
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

      const [url, options] = fetchMock.mock.calls[0];
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

      const [, options] = fetchMock.mock.calls[0];
      expect(options?.method).toBe('POST');
      expect(options?.body).toBe(JSON.stringify(requestBody));
    });

    test('should throw IyzicoApiError on 4xx response', async () => {
      const mockErrorResponse = {
        status: 'failure',
        errorMessage: 'Invalid request',
        errorCode: 'INVALID_REQUEST',
      };

      fetchMock.mockResolvedValue(
        new Response(JSON.stringify(mockErrorResponse), {
          status: 400,
          headers: { 'content-type': 'application/json' },
        })
      );

      let error: IyzicoApiError | undefined;
      try {
        await client.request({
          path: '/test',
          method: 'POST',
          body: { invalid: 'data' },
        });
      } catch (e) {
        error = e as IyzicoApiError;
      }

      expect(error).toBeInstanceOf(IyzicoApiError);
      expect(error!.message).toBe('Invalid request');
      expect(error!.statusCode).toBe(400);
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

    test('should handle timeout errors', async () => {
      const shortTimeoutClient = new IyzicoClient({
        ...validOptions,
        timeout: 1000,
      });

      // Mock a slow response that respects AbortController
      fetchMock.mockImplementation(
        (url, init) =>
          new Promise((resolve, reject) => {
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

      let error: IyzicoNetworkError | undefined;
      try {
        await shortTimeoutClient.request({
          path: '/test',
          method: 'GET',
        });
      } catch (e) {
        error = e as IyzicoNetworkError;
      }

      expect(error).toBeInstanceOf(IyzicoNetworkError);
      expect(error!.message).toBe('Request timeout after 1000ms');
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

      const [, options] = fetchMock.mock.calls[0];
      const headers = options?.headers as Record<string, string>;

      expect(headers['X-Request-ID']).toMatch(/^req_\d+_[a-z0-9]{9}$/);
    });
  });

  describe('error classes', () => {
    test('IyzicoApiError should format message correctly', () => {
      const error = new IyzicoApiError(
        'Test error',
        400,
        { errorCode: 'TEST_ERROR' },
        'req_123'
      );

      expect(error.name).toBe('IyzicoApiError');
      expect(error.message).toBe('Test error');
      expect(error.statusCode).toBe(400);
      expect(error.requestId).toBe('req_123');
      expect(error.getFormattedMessage()).toBe(
        '[400] Test error | Request ID: req_123 | Error Code: TEST_ERROR'
      );
    });

    test('IyzicoNetworkError should preserve cause', () => {
      const originalError = new Error('Original error');
      const networkError = new IyzicoNetworkError(
        'Network error',
        originalError
      );

      expect(networkError.name).toBe('IyzicoNetworkError');
      expect(networkError.message).toBe('Network error');
      expect(networkError.cause).toBe(originalError);
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
