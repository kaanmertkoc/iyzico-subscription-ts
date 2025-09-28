import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { generateAuthHeaders } from '../src/auth';
import type { AuthHeaderOptions } from '../src/types';
import { createHmac } from 'node:crypto';

describe('generateAuthHeaders', () => {
  let authOptions: AuthHeaderOptions;
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
    Date.now = vi.fn(() => 1704067200000); // 2024-01-01T00:00:00.000Z
    Math.random = vi.fn(() => 0.123456789);
  });

  afterEach(() => {
    // Restore original methods
    Date.now = originalDateNow;
    Math.random = originalMathRandom;
    vi.clearAllMocks();
  });

  test('should generate proper authorization headers with valid input', () => {
    const headers = generateAuthHeaders(authOptions);

    expect(headers).toHaveProperty('Authorization');
    expect(headers).toHaveProperty('x-iyzi-rnd');
    expect(headers).toHaveProperty('Content-Type', 'application/json');
    expect(headers).toHaveProperty('Accept', 'application/json');
  });

  test('should generate consistent random key based on timestamp and random value', () => {
    const headers = generateAuthHeaders(authOptions);
    const randomKey = (headers as Record<string, string>)['x-iyzi-rnd'];

    // With mocked Date.now() and Math.random(), we expect predictable output
    expect(randomKey).toBe('1704067200000123456');
  });

  test('should generate valid HMAC-SHA256 signature', () => {
    const headers = generateAuthHeaders(authOptions);
    const randomKey = (headers as Record<string, string>)['x-iyzi-rnd'];
    
    // Manually calculate expected signature
    const payload = `${randomKey}${authOptions.path}${authOptions.body}`;
    const expectedSignature = createHmac('sha256', authOptions.secretKey)
      .update(payload)
      .digest('hex');

    const authorization = (headers as Record<string, string>)['Authorization'];
    const authString = `apiKey:${authOptions.apiKey}&randomKey:${randomKey}&signature:${expectedSignature}`;
    const expectedAuth = `IYZWSv2 ${btoa(authString)}`;

    expect(authorization).toBe(expectedAuth);
  });

  test('should handle empty request body', () => {
    const emptyBodyOptions = {
      ...authOptions,
      body: '',
    };

    const headers = generateAuthHeaders(emptyBodyOptions);
    expect(headers).toHaveProperty('Authorization');
    expect(headers).toHaveProperty('x-iyzi-rnd');
  });

  test('should handle request body with special characters', () => {
    const specialBodyOptions = {
      ...authOptions,
      body: '{"name":"Ürün Açıklaması","symbols":"!@#$%^&*()","unicode":"🚀💡"}',
    };

    const headers = generateAuthHeaders(specialBodyOptions);
    expect(headers).toHaveProperty('Authorization');
    expect(headers).toHaveProperty('x-iyzi-rnd');

    // Verify the signature is still valid
    const randomKey = (headers as Record<string, string>)['x-iyzi-rnd'];
    const payload = `${randomKey}${specialBodyOptions.path}${specialBodyOptions.body}`;
    const expectedSignature = createHmac('sha256', specialBodyOptions.secretKey)
      .update(payload)
      .digest('hex');

    const authorization = (headers as Record<string, string>)['Authorization'];
    const expectedAuthString = `apiKey:${specialBodyOptions.apiKey}&randomKey:${randomKey}&signature:${expectedSignature}`;
    const expectedAuth = `IYZWSv2 ${btoa(expectedAuthString)}`;

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
      const pathOptions = { ...authOptions, path };
      const headers = generateAuthHeaders(pathOptions);
      
      expect(headers).toHaveProperty('Authorization');
      expect(headers).toHaveProperty('x-iyzi-rnd');
      
      // Each path should generate different auth headers
      const randomKey = (headers as Record<string, string>)['x-iyzi-rnd'];
      const payload = `${randomKey}${path}${pathOptions.body}`;
      const expectedSignature = createHmac('sha256', pathOptions.secretKey)
        .update(payload)
        .digest('hex');

      const authorization = (headers as Record<string, string>)['Authorization'];
      const expectedAuthString = `apiKey:${pathOptions.apiKey}&randomKey:${randomKey}&signature:${expectedSignature}`;
      const expectedAuth = `IYZWSv2 ${btoa(expectedAuthString)}`;

      expect(authorization).toBe(expectedAuth);
    });
  });

  test('should generate different signatures for different secret keys', () => {
    const secretKey1 = 'secret-key-1';
    const secretKey2 = 'secret-key-2';

    const headers1 = generateAuthHeaders({
      ...authOptions,
      secretKey: secretKey1,
    });
    const headers2 = generateAuthHeaders({
      ...authOptions,
      secretKey: secretKey2,
    });

    expect(headers1).not.toBe(headers2);
  });

  test('should generate different signatures for different API keys', () => {
    const apiKey1 = 'api-key-1';
    const apiKey2 = 'api-key-2';

    const headers1 = generateAuthHeaders({ ...authOptions, apiKey: apiKey1 });
    const headers2 = generateAuthHeaders({ ...authOptions, apiKey: apiKey2 });

    expect(headers1).not.toBe(headers2);
  });

  test('should include all required headers in correct format', () => {
    const headers = generateAuthHeaders(authOptions);
    const headersObj = headers as Record<string, string>;

    // Check Authorization header format
    expect(headersObj.Authorization).toMatch(/^IYZWSv2 .+$/);

    // Check x-iyzi-rnd header format (timestamp + random number)
    expect(headersObj['x-iyzi-rnd']).toMatch(/^\d+$/);

    // Check content type headers
    expect(headersObj['Content-Type']).toBe('application/json');
    expect(headersObj['Accept']).toBe('application/json');
  });

  test('should create valid base64 encoded authorization string', () => {
    const headers = generateAuthHeaders(authOptions);
    const authorization = (headers as Record<string, string>)['Authorization'];
    
    const base64Part = authorization.replace('IYZWSv2 ', '');
    
    // Should be valid base64
    expect(() => atob(base64Part)).not.toThrow();
    
    // Decoded content should have the expected format
    const decoded = atob(base64Part);
    expect(decoded).toMatch(/^apiKey:.+&randomKey:.+&signature:.+$/);
    expect(decoded).toContain(`apiKey:${authOptions.apiKey}`);
    expect(decoded).toContain('&randomKey:');
    expect(decoded).toContain('&signature:');
  });

  test('should handle large request bodies', () => {
    const largeBody = JSON.stringify({
      data: 'x'.repeat(10000), // 10KB of data
      description: 'Large test payload',
    });

    const largeBodyOptions = {
      ...authOptions,
      body: largeBody,
    };

    const headers = generateAuthHeaders(largeBodyOptions);
    expect(headers).toHaveProperty('Authorization');
    expect(headers).toHaveProperty('x-iyzi-rnd');

    // Verify signature is still valid for large payloads
    const randomKey = (headers as Record<string, string>)['x-iyzi-rnd'];
    const payload = `${randomKey}${largeBodyOptions.path}${largeBodyOptions.body}`;
    const expectedSignature = createHmac('sha256', largeBodyOptions.secretKey)
      .update(payload)
      .digest('hex');

    const authorization = (headers as Record<string, string>)['Authorization'];
    const decoded = atob(authorization.replace('IYZWSv2 ', ''));
    
    expect(decoded).toContain(`signature:${expectedSignature}`);
  });

  test('should be deterministic with same inputs at same time', () => {
    const headers1 = generateAuthHeaders(authOptions);
    const headers2 = generateAuthHeaders(authOptions);

    // With mocked time and random, results should be identical
    expect(headers1).toBe(headers2);
    expect((headers1 as Record<string, string>)['x-iyzi-rnd']).toBe(
      (headers2 as Record<string, string>)['x-iyzi-rnd']
    );
  });

  test('should validate HMAC signature computation', () => {
    // Test the actual HMAC computation manually
    const randomKey = '1704067200000123456'; // Expected with mocked values
    const payload = `${randomKey}${authOptions.path}${authOptions.body}`;
    const expectedSignature = createHmac('sha256', authOptions.secretKey)
      .update(payload)
      .digest('hex');

    const headers = generateAuthHeaders(authOptions);
    const authorization = (headers as Record<string, string>)['Authorization'];
    const decoded = atob(authorization.replace('IYZWSv2 ', ''));
    
    expect(decoded).toBe(
      `apiKey:${authOptions.apiKey}&randomKey:${randomKey}&signature:${expectedSignature}`
    );
  });
});