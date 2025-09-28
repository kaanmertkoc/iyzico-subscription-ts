import { createHmac } from 'node:crypto';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import {
  AuthManager,
  generateAuthHeaders,
  IYZICO_AUTH_VERSION,
} from '../src/auth';
import type { AuthConfig } from '../src/types/auth';

describe('AuthManager', () => {
  let authConfig: AuthConfig;
  let authManager: AuthManager;
  let mockTimestamp: () => number;
  let mockRandom: () => number;

  beforeEach(() => {
    authConfig = {
      apiKey: 'test-api-key',
      secretKey: 'test-secret-key',
      path: '/v2/subscription/products',
      body: '{"name":"Test Product","description":"Test Description"}',
    };

    // Mock providers for deterministic testing
    mockTimestamp = vi.fn(() => 1704067200000); // 2024-01-01T00:00:00.000Z
    mockRandom = vi.fn(() => 0.123456789);

    authManager = new AuthManager({
      timestampProvider: mockTimestamp,
      randomProvider: mockRandom,
      debug: false,
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  test('should generate proper authorization headers with valid input', () => {
    const result = authManager.generateAuthHeaders(authConfig);

    expect(result.headers).toHaveProperty('Authorization');
    expect(result.headers).toHaveProperty('x-iyzi-rnd');
    expect(result.headers).toHaveProperty('Content-Type', 'application/json');
    expect(result.headers).toHaveProperty('Accept', 'application/json');
    expect(result.randomKey).toBeDefined();
    expect(result.signature).toBeDefined();
  });

  test('should generate consistent random key based on timestamp and random value', () => {
    const result = authManager.generateAuthHeaders(authConfig);
    const randomKey = result.headers['x-iyzi-rnd'];

    // With mocked providers, we expect predictable output
    expect(randomKey).toBe('1704067200000211111');
    expect(result.randomKey).toBe('1704067200000211111');
  });

  test('should generate valid HMAC-SHA256 signature', () => {
    const result = authManager.generateAuthHeaders(authConfig);
    const randomKey = result.headers['x-iyzi-rnd'];

    // Manually calculate expected signature
    const payload = `${randomKey}${authConfig.path}${authConfig.body}`;
    const expectedSignature = createHmac('sha256', authConfig.secretKey)
      .update(payload, 'utf8')
      .digest('hex');

    const authorization = result.headers.Authorization;
    const authString = `apiKey:${authConfig.apiKey}&randomKey:${randomKey}&signature:${expectedSignature}`;
    const expectedAuth = `${IYZICO_AUTH_VERSION} ${btoa(authString)}`;

    expect(authorization).toBe(expectedAuth);
    expect(result.signature).toBe(expectedSignature);
  });

  test('should handle empty request body', () => {
    const emptyBodyConfig = {
      ...authConfig,
      body: '',
    };

    const result = authManager.generateAuthHeaders(emptyBodyConfig);
    expect(result.headers).toHaveProperty('Authorization');
    expect(result.headers).toHaveProperty('x-iyzi-rnd');
  });

  test('should handle request body with special characters', () => {
    const specialBodyConfig = {
      ...authConfig,
      body: '{"name":"Ürün Açıklaması","symbols":"!@#$%^&*()","unicode":"🚀💡"}',
    };

    const result = authManager.generateAuthHeaders(specialBodyConfig);
    expect(result.headers).toHaveProperty('Authorization');
    expect(result.headers).toHaveProperty('x-iyzi-rnd');

    // Verify the signature is still valid
    const randomKey = result.headers['x-iyzi-rnd'];
    const payload = `${randomKey}${specialBodyConfig.path}${specialBodyConfig.body}`;
    const expectedSignature = createHmac('sha256', specialBodyConfig.secretKey)
      .update(payload, 'utf8')
      .digest('hex');

    const authorization = result.headers.Authorization;
    const expectedAuthString = `apiKey:${specialBodyConfig.apiKey}&randomKey:${randomKey}&signature:${expectedSignature}`;
    const expectedAuth = `${IYZICO_AUTH_VERSION} ${btoa(expectedAuthString)}`;

    expect(authorization).toBe(expectedAuth);
  });

  test('should handle different API paths', () => {
    const pathVariations = [
      '/v2/subscription/products',
      '/v2/subscription/plans/123',
      '/v2/subscription/checkout/forms',
      '/health/bin-check',
    ];

    pathVariations.forEach((path) => {
      const pathConfig = { ...authConfig, path };
      const result = authManager.generateAuthHeaders(pathConfig);

      expect(result.headers).toHaveProperty('Authorization');
      expect(result.headers).toHaveProperty('x-iyzi-rnd');

      // Each path should generate different auth headers
      const randomKey = result.headers['x-iyzi-rnd'];
      const payload = `${randomKey}${path}${pathConfig.body}`;
      const expectedSignature = createHmac('sha256', pathConfig.secretKey)
        .update(payload, 'utf8')
        .digest('hex');

      const authorization = result.headers.Authorization;
      const expectedAuthString = `apiKey:${pathConfig.apiKey}&randomKey:${randomKey}&signature:${expectedSignature}`;
      const expectedAuth = `${IYZICO_AUTH_VERSION} ${btoa(expectedAuthString)}`;

      expect(authorization).toBe(expectedAuth);
    });
  });

  test('should generate different signatures for different secret keys', () => {
    const secretKey1 = 'secret-key-1';
    const secretKey2 = 'secret-key-2';

    const result1 = authManager.generateAuthHeaders({
      ...authConfig,
      secretKey: secretKey1,
    });
    const result2 = authManager.generateAuthHeaders({
      ...authConfig,
      secretKey: secretKey2,
    });

    expect(result1.headers.Authorization).not.toBe(
      result2.headers.Authorization
    );
  });

  test('should generate different signatures for different API keys', () => {
    const apiKey1 = 'api-key-1';
    const apiKey2 = 'api-key-2';

    const result1 = authManager.generateAuthHeaders({
      ...authConfig,
      apiKey: apiKey1,
    });
    const result2 = authManager.generateAuthHeaders({
      ...authConfig,
      apiKey: apiKey2,
    });

    expect(result1.headers.Authorization).not.toBe(
      result2.headers.Authorization
    );
  });

  test('should include all required headers in correct format', () => {
    const result = authManager.generateAuthHeaders(authConfig);

    // Check Authorization header format
    expect(result.headers.Authorization).toMatch(/^IYZWSv2 .+$/);

    // Check x-iyzi-rnd header format (timestamp + random number)
    expect(result.headers['x-iyzi-rnd']).toMatch(/^\d+$/);

    // Check content type headers
    expect(result.headers['Content-Type']).toBe('application/json');
    expect(result.headers.Accept).toBe('application/json');
  });

  test('should create valid base64 encoded authorization string', () => {
    const result = authManager.generateAuthHeaders(authConfig);
    const authorization = result.headers.Authorization;

    const base64Part = authorization.replace(`${IYZICO_AUTH_VERSION} `, '');

    // Should be valid base64
    expect(() => atob(base64Part)).not.toThrow();

    // Decoded content should have the expected format
    const decoded = atob(base64Part);
    expect(decoded).toMatch(/^apiKey:.+&randomKey:.+&signature:.+$/);
    expect(decoded).toContain(`apiKey:${authConfig.apiKey}`);
    expect(decoded).toContain('&randomKey:');
    expect(decoded).toContain('&signature:');
  });

  test('should handle large request bodies', () => {
    const largeBody = JSON.stringify({
      data: 'x'.repeat(10000), // 10KB of data
      description: 'Large test payload',
    });

    const largeBodyConfig = {
      ...authConfig,
      body: largeBody,
    };

    const result = authManager.generateAuthHeaders(largeBodyConfig);
    expect(result.headers).toHaveProperty('Authorization');
    expect(result.headers).toHaveProperty('x-iyzi-rnd');

    // Verify signature is still valid for large payloads
    const randomKey = result.headers['x-iyzi-rnd'];
    const payload = `${randomKey}${largeBodyConfig.path}${largeBodyConfig.body}`;
    const expectedSignature = createHmac('sha256', largeBodyConfig.secretKey)
      .update(payload, 'utf8')
      .digest('hex');

    const authorization = result.headers.Authorization;
    const decoded = atob(authorization.replace(`${IYZICO_AUTH_VERSION} `, ''));

    expect(decoded).toContain(`signature:${expectedSignature}`);
  });

  test('should be deterministic with same inputs at same time', () => {
    const result1 = authManager.generateAuthHeaders(authConfig);
    const result2 = authManager.generateAuthHeaders(authConfig);

    // With mocked providers, results should be identical
    expect(result1.headers).toEqual(result2.headers);
    expect(result1.headers.Authorization).toBe(result2.headers.Authorization);
    expect(result1.headers['x-iyzi-rnd']).toBe(result2.headers['x-iyzi-rnd']);
  });

  test('should validate HMAC signature computation', () => {
    // Test the actual HMAC computation manually
    const randomKey = '1704067200000211111'; // Expected with mocked values
    const payload = `${randomKey}${authConfig.path}${authConfig.body}`;
    const expectedSignature = createHmac('sha256', authConfig.secretKey)
      .update(payload, 'utf8')
      .digest('hex');

    const result = authManager.generateAuthHeaders(authConfig);
    const authorization = result.headers.Authorization;
    const decoded = atob(authorization.replace(`${IYZICO_AUTH_VERSION} `, ''));

    expect(decoded).toBe(
      `apiKey:${authConfig.apiKey}&randomKey:${randomKey}&signature:${expectedSignature}`
    );
  });

  describe('validation', () => {
    test('should throw error for invalid API key', () => {
      const invalidConfig = { ...authConfig, apiKey: '' };
      expect(() => authManager.generateAuthHeaders(invalidConfig)).toThrow(
        'API key is required and must be a non-empty string'
      );
    });

    test('should throw error for invalid secret key', () => {
      const invalidConfig = { ...authConfig, secretKey: '' };
      expect(() => authManager.generateAuthHeaders(invalidConfig)).toThrow(
        'Secret key is required and must be a non-empty string'
      );
    });

    test('should throw error for invalid path', () => {
      const invalidConfig = { ...authConfig, path: 'invalid-path' };
      expect(() => authManager.generateAuthHeaders(invalidConfig)).toThrow(
        'Request path must start with "/"'
      );
    });

    test('should validate that body is a string', () => {
      const invalidConfig = { ...authConfig, body: undefined as any };
      expect(() => authManager.generateAuthHeaders(invalidConfig)).toThrow(
        'Request body must be a string (use empty string for no body)'
      );
    });
  });

  describe('static utilities', () => {
    test('should validate timestamps within acceptable skew', () => {
      const now = Date.now();
      expect(AuthManager.isTimestampValid(now)).toBe(true);
      expect(AuthManager.isTimestampValid(now - 60000)).toBe(true); // 1 minute ago
      expect(AuthManager.isTimestampValid(now - 600000)).toBe(false); // 10 minutes ago
    });
  });
});

describe('generateAuthHeaders (compatibility)', () => {
  let authOptions: any;
  let originalDateNow: typeof Date.now;
  let originalMathRandom: typeof Math.random;

  beforeEach(() => {
    authOptions = {
      apiKey: 'test-api-key',
      secretKey: 'test-secret-key',
      path: '/v2/subscription/products',
      body: '{"name":"Test Product","description":"Test Description"}',
    };

    // Mock Date.now and Math.random for predictable tests
    originalDateNow = Date.now;
    originalMathRandom = Math.random;
    Date.now = vi.fn(() => 1704067200000);
    Math.random = vi.fn(() => 0.123456789);
  });

  afterEach(() => {
    // Restore original methods
    Date.now = originalDateNow;
    Math.random = originalMathRandom;
    vi.clearAllMocks();
  });

  test('should work for backwards compatibility', () => {
    const headers = generateAuthHeaders(authOptions);

    expect(headers).toHaveProperty('Authorization');
    expect(headers).toHaveProperty('x-iyzi-rnd');
    expect(headers).toHaveProperty('Content-Type', 'application/json');
    expect(headers).toHaveProperty('Accept', 'application/json');
  });

  test('should generate consistent results with legacy interface', () => {
    const headers = generateAuthHeaders(authOptions);
    const randomKey = headers['x-iyzi-rnd'];

    // With mocked Date.now() and Math.random(), we expect predictable output
    expect(randomKey).toBe('1704067200000211111');
  });
});
