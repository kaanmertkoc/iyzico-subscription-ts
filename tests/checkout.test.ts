import { beforeEach, describe, expect, test, vi } from 'vitest';
import { IYZICO_SANDBOX_BASE_URL, type IyzicoClient } from '../src/client';
import { IyzicoApiError, IyzicoNetworkError } from '../src/error';
import { CheckoutService } from '../src/services/checkout';
import type {
  InitializeCheckoutRequest,
  CheckoutFormResponse,
  CheckoutFormData,
} from '../src/types';
import { BaseCustomer } from '../src/types/core';

// Create a mock client
const mockClient = {
  request: vi.fn(),
} as unknown as IyzicoClient;

describe('CheckoutService', () => {
  let checkoutService: CheckoutService;

  beforeEach(() => {
    checkoutService = new CheckoutService(mockClient);
    vi.clearAllMocks();
  });

  describe('initialize', () => {
    test('should make successful checkout form initialization request', async () => {
      // Arrange
      const initializeRequest: InitializeCheckoutRequest = {
        name: 'John',
        surname: 'Doe',
        email: 'john.doe@example.com',
        gsmNumber: '+905551234567',
        identityNumber: '11111111111',
        pricingPlanReferenceCode: 'PLAN_123456',
        callbackUrl: 'https://example.com/callback',
        billingAddress: {
          contactName: 'John Doe',
          country: 'Turkey',
          city: 'Istanbul',
          address: 'Test Address 123',
        },
        shippingAddress: {
          contactName: 'John Doe',
          country: 'Turkey',
          city: 'Istanbul',
          address: 'Test Address 123',
        },
      };

      const mockCheckoutFormData: CheckoutFormData = {
        checkoutFormContent: '<html>...</html>',
        token: 'checkout_token_abc123',
        paymentPageUrl: IYZICO_SANDBOX_BASE_URL + `/checkout`,
      };

      const expectedResponse: CheckoutFormResponse = {
        status: 'success',
        systemTime: 1640995200000,
        data: mockCheckoutFormData,
      };

      mockClient.request = vi.fn().mockResolvedValue(expectedResponse);

      // Act
      const result = await checkoutService.initialize(initializeRequest);

      // Assert
      expect(result).toEqual(expectedResponse);
      expect(mockClient.request).toHaveBeenCalledOnce();
      expect(mockClient.request).toHaveBeenCalledWith({
        path: '/v2/subscription/checkoutform/initialize',
        method: 'POST',
        body: {
          locale: 'tr',
          conversationId: expect.stringMatching(/^checkout-\d+$/),
          pricingPlanReferenceCode: 'PLAN_123456',
          subscriptionInitialStatus: 'PENDING',
          callbackUrl: 'https://example.com/callback',
          customer: {
            name: 'John',
            surname: 'Doe',
            email: 'john.doe@example.com',
            gsmNumber: '+905551234567',
            identityNumber: '11111111111',
            billingAddress: {
              contactName: 'John Doe',
              country: 'Turkey',
              city: 'Istanbul',
              address: 'Test Address 123',
            },
            shippingAddress: {
              contactName: 'John Doe',
              country: 'Turkey',
              city: 'Istanbul',
              address: 'Test Address 123',
            },
          },
        },
      });
    });

    test('should automatically prepend +90 to gsm number if not present', async () => {
      // Arrange
      const initializeRequest: InitializeCheckoutRequest = {
        name: 'Jane',
        surname: 'Smith',
        email: 'jane.smith@example.com',
        gsmNumber: '5551234567', // Without country code
        identityNumber: '22222222222',
        pricingPlanReferenceCode: 'PLAN_789',
        callbackUrl: 'https://example.com/callback',
        billingAddress: {
          contactName: 'Jane Smith',
          country: 'Turkey',
          city: 'Ankara',
          address: 'Test Address 456',
        },
        shippingAddress: {
          contactName: 'Jane Smith',
          country: 'Turkey',
          city: 'Ankara',
          address: 'Test Address 456',
        },
      };

      const mockResponse: CheckoutFormResponse = {
        status: 'success',
        systemTime: 1640995200000,
        data: {
          checkoutFormContent: '<html>...</html>',
          token: 'checkout_token_xyz789',
          paymentPageUrl: 'https://sandbox-api.iyzipay.com/checkout',
        },
      };

      mockClient.request = vi.fn().mockResolvedValue(mockResponse);

      // Act
      await checkoutService.initialize(initializeRequest);

      // Assert
      const [callArgs] = (mockClient.request as ReturnType<typeof vi.fn>).mock
        .calls[0] as [
        { path: string; method: string; body: Record<string, unknown> }
      ];
      expect((callArgs.body.customer as any).gsmNumber).toBe('+905551234567');
    });

    test('should not modify gsm number if it already starts with +90', async () => {
      // Arrange
      const initializeRequest: InitializeCheckoutRequest = {
        name: 'Bob',
        surname: 'Johnson',
        email: 'bob.johnson@example.com',
        gsmNumber: '+905559876543', // Already has country code
        identityNumber: '33333333333',
        pricingPlanReferenceCode: 'PLAN_456',
        callbackUrl: 'https://example.com/callback',
        billingAddress: {
          contactName: 'Bob Johnson',
          country: 'Turkey',
          city: 'Izmir',
          address: 'Test Address 789',
        },
        shippingAddress: {
          contactName: 'Bob Johnson',
          country: 'Turkey',
          city: 'Izmir',
          address: 'Test Address 789',
        },
      };

      const mockResponse: CheckoutFormResponse = {
        status: 'success',
        systemTime: 1640995200000,
        data: {
          checkoutFormContent: '<html>...</html>',
          token: 'checkout_token_def456',
        },
      };

      mockClient.request = vi.fn().mockResolvedValue(mockResponse);

      // Act
      await checkoutService.initialize(initializeRequest);

      // Assert
      const [callArgs] = (mockClient.request as ReturnType<typeof vi.fn>).mock
        .calls[0] as [
        { path: string; method: string; body: Record<string, unknown> }
      ];
      expect((callArgs.body.customer as any).gsmNumber).toBe('+905559876543');
    });

    test('should merge default parameters with provided parameters', async () => {
      // Arrange
      const initializeRequest: InitializeCheckoutRequest = {
        name: 'Alice',
        surname: 'Williams',
        email: 'alice.williams@example.com',
        gsmNumber: '+905551112233',
        identityNumber: '44444444444',
        pricingPlanReferenceCode: 'PLAN_CUSTOM',
        callbackUrl: 'https://example.com/custom-callback',
        billingAddress: {
          contactName: 'Alice Williams',
          country: 'Turkey',
          city: 'Bursa',
          address: 'Custom Address 111',
        },
        shippingAddress: {
          contactName: 'Alice Williams',
          country: 'Turkey',
          city: 'Bursa',
          address: 'Custom Address 111',
        },
        conversationId: 'custom-conversation-id', // Custom conversation ID
        locale: 'en', // Custom locale
        subscriptionInitialStatus: 'ACTIVE', // Custom status
      };

      const mockResponse: CheckoutFormResponse = {
        status: 'success',
        systemTime: 1640995200000,
        data: {
          checkoutFormContent: '<html>...</html>',
          token: 'checkout_token_custom',
        },
      };

      mockClient.request = vi.fn().mockResolvedValue(mockResponse);

      // Act
      await checkoutService.initialize(initializeRequest);

      // Assert
      expect(mockClient.request).toHaveBeenCalledWith({
        path: '/v2/subscription/checkoutform/initialize',
        method: 'POST',
        body: {
          locale: 'en', // Custom locale should override default
          conversationId: 'custom-conversation-id', // Custom conversation ID should override default
          pricingPlanReferenceCode: 'PLAN_CUSTOM',
          subscriptionInitialStatus: 'ACTIVE', // Custom status should override default
          callbackUrl: 'https://example.com/custom-callback',
          customer: expect.any(Object),
        },
      });
    });

    test('should generate dynamic conversationId with current timestamp', async () => {
      // Arrange
      const initializeRequest: InitializeCheckoutRequest = {
        name: 'Charlie',
        surname: 'Brown',
        email: 'charlie.brown@example.com',
        gsmNumber: '5554443322',
        identityNumber: '55555555555',
        pricingPlanReferenceCode: 'PLAN_TEST',
        callbackUrl: 'https://example.com/callback',
        billingAddress: {
          contactName: 'Charlie Brown',
          country: 'Turkey',
          city: 'Antalya',
          address: 'Test Address',
        },
        shippingAddress: {
          contactName: 'Charlie Brown',
          country: 'Turkey',
          city: 'Antalya',
          address: 'Test Address',
        },
      };

      const mockResponse: CheckoutFormResponse = {
        status: 'success',
        systemTime: 1640995200000,
        data: {
          checkoutFormContent: '<html>...</html>',
          token: 'checkout_token_test',
        },
      };

      mockClient.request = vi.fn().mockResolvedValue(mockResponse);
      const beforeTime = Date.now();

      // Act
      await checkoutService.initialize(initializeRequest);
      const afterTime = Date.now();

      // Assert
      const [callArgs] = (mockClient.request as ReturnType<typeof vi.fn>).mock
        .calls[0] as [
        { path: string; method: string; body: Record<string, unknown> }
      ];
      const conversationId = callArgs.body.conversationId as string;

      expect(conversationId).toMatch(/^checkout-\d+$/);

      // Extract timestamp from conversationId and verify it's recent
      const timestamp = parseInt(conversationId.replace('checkout-', ''));
      expect(timestamp).toBeGreaterThanOrEqual(beforeTime);
      expect(timestamp).toBeLessThanOrEqual(afterTime);
    });

    test('should handle API errors gracefully', async () => {
      // Arrange
      const initializeRequest: InitializeCheckoutRequest = {
        name: '',
        surname: '',
        email: 'invalid-email',
        gsmNumber: '123',
        identityNumber: '111',
        pricingPlanReferenceCode: '',
        callbackUrl: '',
        billingAddress: {
          contactName: '',
          country: '',
          city: '',
          address: '',
        },
        shippingAddress: {
          contactName: '',
          country: '',
          city: '',
          address: '',
        },
      };

      const apiError = new IyzicoApiError(
        'Validation failed: invalid customer data',
        400,
        {
          status: 'failure',
          errorMessage: 'Validation failed: invalid customer data',
          errorCode: 'VALIDATION_ERROR',
        }
      );
      mockClient.request = vi.fn().mockRejectedValue(apiError);

      // Act & Assert
      await expect(
        checkoutService.initialize(initializeRequest)
      ).rejects.toThrow(IyzicoApiError);

      try {
        await checkoutService.initialize(initializeRequest);
      } catch (error) {
        expect(error).toBeInstanceOf(IyzicoApiError);
        if (error instanceof IyzicoApiError) {
          expect(error.statusCode).toBe(400);
          expect(error.isClientError()).toBe(true);
        }
      }
    });

    test('should handle network errors', async () => {
      // Arrange
      const initializeRequest: InitializeCheckoutRequest = {
        name: 'Network',
        surname: 'Test',
        email: 'network.test@example.com',
        gsmNumber: '5551234567',
        identityNumber: '66666666666',
        pricingPlanReferenceCode: 'PLAN_NETWORK',
        callbackUrl: 'https://example.com/callback',
        billingAddress: {
          contactName: 'Network Test',
          country: 'Turkey',
          city: 'Istanbul',
          address: 'Test Address',
        },
        shippingAddress: {
          contactName: 'Network Test',
          country: 'Turkey',
          city: 'Istanbul',
          address: 'Test Address',
        },
      };

      const networkError = new IyzicoNetworkError('Network connection failed');
      mockClient.request = vi.fn().mockRejectedValue(networkError);

      // Act & Assert
      await expect(
        checkoutService.initialize(initializeRequest)
      ).rejects.toThrow(IyzicoNetworkError);

      expect(mockClient.request).toHaveBeenCalledOnce();
    });

    test('should handle plan not found error', async () => {
      // Arrange
      const initializeRequest: InitializeCheckoutRequest = {
        name: 'Test',
        surname: 'User',
        email: 'test.user@example.com',
        gsmNumber: '5551234567',
        identityNumber: '77777777777',
        pricingPlanReferenceCode: 'PLAN_NOT_EXISTS',
        callbackUrl: 'https://example.com/callback',
        billingAddress: {
          contactName: 'Test User',
          country: 'Turkey',
          city: 'Istanbul',
          address: 'Test Address',
        },
        shippingAddress: {
          contactName: 'Test User',
          country: 'Turkey',
          city: 'Istanbul',
          address: 'Test Address',
        },
      };

      const notFoundError = new IyzicoApiError('Pricing plan not found', 404, {
        status: 'failure',
        errorMessage: 'Pricing plan not found',
        errorCode: 'PLAN_NOT_FOUND',
      });
      mockClient.request = vi.fn().mockRejectedValue(notFoundError);

      // Act & Assert
      await expect(
        checkoutService.initialize(initializeRequest)
      ).rejects.toThrow(IyzicoApiError);

      try {
        await checkoutService.initialize(initializeRequest);
      } catch (error) {
        if (error instanceof IyzicoApiError) {
          expect(error.statusCode).toBe(404);
          expect(error.isClientError()).toBe(true);
        }
      }
    });

    test('should handle special characters in customer data', async () => {
      // Arrange
      const initializeRequest: InitializeCheckoutRequest = {
        name: 'Ömer',
        surname: 'Şahin',
        email: 'omer.sahin@örnek.com',
        gsmNumber: '+905551234567',
        identityNumber: '88888888888',
        pricingPlanReferenceCode: 'PLAN_SPECIAL',
        callbackUrl: 'https://example.com/callback?param=value&test=123',
        billingAddress: {
          contactName: 'Ömer Şahin',
          country: 'Türkiye',
          city: 'İstanbul',
          address: 'Çiçek Sokak No:5 Kat:3',
        },
        shippingAddress: {
          contactName: 'Ömer Şahin',
          country: 'Türkiye',
          city: 'İstanbul',
          address: 'Çiçek Sokak No:5 Kat:3',
        },
      };

      const mockResponse: CheckoutFormResponse = {
        status: 'success',
        systemTime: 1640995200000,
        data: {
          checkoutFormContent: '<html>...</html>',
          token: 'checkout_token_special',
        },
      };

      mockClient.request = vi.fn().mockResolvedValue(mockResponse);

      // Act
      const result = await checkoutService.initialize(initializeRequest);

      // Assert
      expect(result).toEqual(mockResponse);
      const [callArgs] = (mockClient.request as ReturnType<typeof vi.fn>).mock
        .calls[0] as [
        { path: string; method: string; body: Record<string, unknown> }
      ];
      expect((callArgs.body.customer as BaseCustomer).name).toBe('Ömer');
      expect((callArgs.body.customer as BaseCustomer).surname).toBe('Şahin');
      expect(
        (callArgs.body.customer as BaseCustomer).billingAddress?.city
      ).toBe('İstanbul');
    });

    test('should handle address with zipCode', async () => {
      // Arrange
      const initializeRequest: InitializeCheckoutRequest = {
        name: 'David',
        surname: 'Miller',
        email: 'david.miller@example.com',
        gsmNumber: '5551234567',
        identityNumber: '99999999999',
        pricingPlanReferenceCode: 'PLAN_ZIP',
        callbackUrl: 'https://example.com/callback',
        billingAddress: {
          contactName: 'David Miller',
          country: 'Turkey',
          city: 'Istanbul',
          zipCode: '34000',
          address: 'Test Address with Zip',
        },
        shippingAddress: {
          contactName: 'David Miller',
          country: 'Turkey',
          city: 'Istanbul',
          zipCode: '34001',
          address: 'Test Address with Zip',
        },
      };

      const mockResponse: CheckoutFormResponse = {
        status: 'success',
        systemTime: 1640995200000,
        data: {
          checkoutFormContent: '<html>...</html>',
          token: 'checkout_token_zip',
        },
      };

      mockClient.request = vi.fn().mockResolvedValue(mockResponse);

      // Act
      await checkoutService.initialize(initializeRequest);

      // Assert
      const [callArgs] = (mockClient.request as ReturnType<typeof vi.fn>).mock
        .calls[0] as [
        { path: string; method: string; body: Record<string, unknown> }
      ];
      expect((callArgs.body.customer as any).billingAddress.zipCode).toBe(
        '34000'
      );
      expect((callArgs.body.customer as any).shippingAddress.zipCode).toBe(
        '34001'
      );
    });
  });

  describe('retrieve', () => {
    test('should make successful checkout form retrieval request', async () => {
      // Arrange
      const token = 'checkout_token_retrieve_123';
      const mockCheckoutFormData: CheckoutFormData = {
        checkoutFormContent: '<html>...</html>',
        token: token,
        paymentPageUrl: 'https://sandbox-api.iyzipay.com/checkout',
      };

      const expectedResponse = {
        status: 'success',
        systemTime: 1640995200000,
        data: mockCheckoutFormData,
      };

      mockClient.request = vi.fn().mockResolvedValue(expectedResponse);

      // Act
      const result = await checkoutService.retrieve(token);

      // Assert
      expect(result).toEqual(expectedResponse);
      expect(mockClient.request).toHaveBeenCalledOnce();
      expect(mockClient.request).toHaveBeenCalledWith({
        path: `/v2/subscription/checkoutform/${token}`,
        method: 'POST',
        body: {
          conversationId: expect.stringMatching(/^checkout-retrieve-\d+$/),
          token: token,
        },
      });
    });

    test('should generate dynamic conversationId for retrieve', async () => {
      // Arrange
      const token = 'checkout_token_test';
      const mockResponse = {
        status: 'success',
        systemTime: 1640995200000,
        data: {
          checkoutFormContent: '<html>...</html>',
          token: token,
        },
      };

      mockClient.request = vi.fn().mockResolvedValue(mockResponse);
      const beforeTime = Date.now();

      // Act
      await checkoutService.retrieve(token);
      const afterTime = Date.now();

      // Assert
      const [callArgs] = (mockClient.request as ReturnType<typeof vi.fn>).mock
        .calls[0] as [
        { path: string; method: string; body: Record<string, unknown> }
      ];
      const conversationId = callArgs.body.conversationId as string;

      expect(conversationId).toMatch(/^checkout-retrieve-\d+$/);

      // Extract timestamp from conversationId and verify it's recent
      const timestamp = parseInt(
        conversationId.replace('checkout-retrieve-', '')
      );
      expect(timestamp).toBeGreaterThanOrEqual(beforeTime);
      expect(timestamp).toBeLessThanOrEqual(afterTime);
    });

    test('should handle token not found error', async () => {
      // Arrange
      const token = 'invalid_token';
      const notFoundError = new IyzicoApiError('Checkout form not found', 404, {
        status: 'failure',
        errorMessage: 'Checkout form not found',
        errorCode: 'CHECKOUT_FORM_NOT_FOUND',
      });
      mockClient.request = vi.fn().mockRejectedValue(notFoundError);

      // Act & Assert
      await expect(checkoutService.retrieve(token)).rejects.toThrow(
        IyzicoApiError
      );

      expect(mockClient.request).toHaveBeenCalledWith({
        path: `/v2/subscription/checkoutform/${token}`,
        method: 'POST',
        body: {
          conversationId: expect.stringMatching(/^checkout-retrieve-\d+$/),
          token: token,
        },
      });
    });

    test('should handle expired token error', async () => {
      // Arrange
      const token = 'expired_token_123';
      const expiredError = new IyzicoApiError(
        'Checkout form token expired',
        400,
        {
          status: 'failure',
          errorMessage: 'Checkout form token expired',
          errorCode: 'TOKEN_EXPIRED',
        }
      );
      mockClient.request = vi.fn().mockRejectedValue(expiredError);

      // Act & Assert
      await expect(checkoutService.retrieve(token)).rejects.toThrow(
        IyzicoApiError
      );

      try {
        await checkoutService.retrieve(token);
      } catch (error) {
        if (error instanceof IyzicoApiError) {
          expect(error.statusCode).toBe(400);
          expect(error.isClientError()).toBe(true);
        }
      }
    });

    test('should handle network errors during retrieval', async () => {
      // Arrange
      const token = 'network_test_token';
      const networkError = new IyzicoNetworkError('Request timeout');
      mockClient.request = vi.fn().mockRejectedValue(networkError);

      // Act & Assert
      await expect(checkoutService.retrieve(token)).rejects.toThrow(
        IyzicoNetworkError
      );

      expect(mockClient.request).toHaveBeenCalledOnce();
    });

    test('should handle empty token', async () => {
      // Arrange
      const token = '';
      const validationError = new IyzicoApiError('Token is required', 400, {
        status: 'failure',
        errorMessage: 'Token is required',
        errorCode: 'VALIDATION_ERROR',
      });
      mockClient.request = vi.fn().mockRejectedValue(validationError);

      // Act & Assert
      await expect(checkoutService.retrieve(token)).rejects.toThrow(
        IyzicoApiError
      );
    });

    test('should retrieve checkout form without paymentPageUrl', async () => {
      // Arrange
      const token = 'token_without_url';
      const mockCheckoutFormData: CheckoutFormData = {
        checkoutFormContent: '<html>...</html>',
        token: token,
      };

      const expectedResponse = {
        status: 'success',
        systemTime: 1640995200000,
        data: mockCheckoutFormData,
      };

      mockClient.request = vi.fn().mockResolvedValue(expectedResponse);

      // Act
      const result = await checkoutService.retrieve(token);

      // Assert
      expect(result.data?.paymentPageUrl).toBeUndefined();
      expect(result.data?.token).toBe(token);
    });

    test('should handle server errors during retrieval (5xx)', async () => {
      // Arrange
      const token = 'server_error_token';
      const serverError = new IyzicoApiError('Internal server error', 500, {
        status: 'failure',
        errorMessage: 'Internal server error',
        errorCode: 'INTERNAL_SERVER_ERROR',
      });
      mockClient.request = vi.fn().mockRejectedValue(serverError);

      // Act & Assert
      await expect(checkoutService.retrieve(token)).rejects.toThrow(
        IyzicoApiError
      );

      try {
        await checkoutService.retrieve(token);
      } catch (error) {
        if (error instanceof IyzicoApiError) {
          expect(error.statusCode).toBe(500);
          expect(error.isServerError()).toBe(true);
          expect(error.isRetryable()).toBe(true);
        }
      }
    });
  });

  // Edge cases and advanced error handling
  describe('edge cases and advanced error handling', () => {
    describe('initialize edge cases', () => {
      test('should handle maximum field length validation', async () => {
        // Arrange
        const initializeRequest: InitializeCheckoutRequest = {
          name: 'A'.repeat(256),
          surname: 'B'.repeat(256),
          email: 'test@example.com',
          gsmNumber: '5551234567',
          identityNumber: '12345678901',
          pricingPlanReferenceCode: 'PLAN_MAX_LENGTH',
          callbackUrl: 'https://example.com/callback',
          billingAddress: {
            contactName: 'C'.repeat(256),
            country: 'Turkey',
            city: 'Istanbul',
            address: 'D'.repeat(1024),
          },
          shippingAddress: {
            contactName: 'E'.repeat(256),
            country: 'Turkey',
            city: 'Istanbul',
            address: 'F'.repeat(1024),
          },
        };

        const apiError = new IyzicoApiError(
          'Field length exceeds maximum',
          400,
          {
            status: 'failure',
            errorMessage: 'Field length exceeds maximum',
            errorCode: 'FIELD_LENGTH_EXCEEDED',
          }
        );

        mockClient.request = vi.fn().mockRejectedValue(apiError);

        // Act & Assert
        await expect(
          checkoutService.initialize(initializeRequest)
        ).rejects.toThrow('Field length exceeds maximum');
      });

      test('should handle invalid email format', async () => {
        // Arrange
        const initializeRequest: InitializeCheckoutRequest = {
          name: 'Test',
          surname: 'User',
          email: 'invalid-email-format',
          gsmNumber: '5551234567',
          identityNumber: '12345678901',
          pricingPlanReferenceCode: 'PLAN_INVALID_EMAIL',
          callbackUrl: 'https://example.com/callback',
          billingAddress: {
            contactName: 'Test User',
            country: 'Turkey',
            city: 'Istanbul',
            address: 'Test Address',
          },
          shippingAddress: {
            contactName: 'Test User',
            country: 'Turkey',
            city: 'Istanbul',
            address: 'Test Address',
          },
        };

        const validationError = new IyzicoApiError(
          'Invalid email format',
          400,
          {
            status: 'failure',
            errorMessage: 'Invalid email format',
            errorCode: 'INVALID_EMAIL',
          }
        );

        mockClient.request = vi.fn().mockRejectedValue(validationError);

        // Act & Assert
        await expect(
          checkoutService.initialize(initializeRequest)
        ).rejects.toThrow('Invalid email format');
      });

      test('should handle invalid identity number', async () => {
        // Arrange
        const initializeRequest: InitializeCheckoutRequest = {
          name: 'Test',
          surname: 'User',
          email: 'test@example.com',
          gsmNumber: '5551234567',
          identityNumber: '123', // Invalid length
          pricingPlanReferenceCode: 'PLAN_INVALID_ID',
          callbackUrl: 'https://example.com/callback',
          billingAddress: {
            contactName: 'Test User',
            country: 'Turkey',
            city: 'Istanbul',
            address: 'Test Address',
          },
          shippingAddress: {
            contactName: 'Test User',
            country: 'Turkey',
            city: 'Istanbul',
            address: 'Test Address',
          },
        };

        const validationError = new IyzicoApiError(
          'Invalid identity number',
          400,
          {
            status: 'failure',
            errorMessage: 'Invalid identity number',
            errorCode: 'INVALID_IDENTITY_NUMBER',
          }
        );

        mockClient.request = vi.fn().mockRejectedValue(validationError);

        // Act & Assert
        await expect(
          checkoutService.initialize(initializeRequest)
        ).rejects.toThrow('Invalid identity number');
      });

      test('should handle invalid callback URL', async () => {
        // Arrange
        const initializeRequest: InitializeCheckoutRequest = {
          name: 'Test',
          surname: 'User',
          email: 'test@example.com',
          gsmNumber: '5551234567',
          identityNumber: '12345678901',
          pricingPlanReferenceCode: 'PLAN_INVALID_URL',
          callbackUrl: 'not-a-valid-url',
          billingAddress: {
            contactName: 'Test User',
            country: 'Turkey',
            city: 'Istanbul',
            address: 'Test Address',
          },
          shippingAddress: {
            contactName: 'Test User',
            country: 'Turkey',
            city: 'Istanbul',
            address: 'Test Address',
          },
        };

        const validationError = new IyzicoApiError(
          'Invalid callback URL',
          400,
          {
            status: 'failure',
            errorMessage: 'Invalid callback URL',
            errorCode: 'INVALID_CALLBACK_URL',
          }
        );

        mockClient.request = vi.fn().mockRejectedValue(validationError);

        // Act & Assert
        await expect(
          checkoutService.initialize(initializeRequest)
        ).rejects.toThrow('Invalid callback URL');
      });

      test('should handle different billing and shipping addresses', async () => {
        // Arrange
        const initializeRequest: InitializeCheckoutRequest = {
          name: 'Different',
          surname: 'Addresses',
          email: 'different.addresses@example.com',
          gsmNumber: '5551234567',
          identityNumber: '11111111111',
          pricingPlanReferenceCode: 'PLAN_DIFF_ADDR',
          callbackUrl: 'https://example.com/callback',
          billingAddress: {
            contactName: 'Billing Contact',
            country: 'Turkey',
            city: 'Istanbul',
            address: 'Billing Address 123',
          },
          shippingAddress: {
            contactName: 'Shipping Contact',
            country: 'Turkey',
            city: 'Ankara',
            address: 'Shipping Address 456',
          },
        };

        const mockResponse: CheckoutFormResponse = {
          status: 'success',
          systemTime: 1640995200000,
          data: {
            checkoutFormContent: '<html>...</html>',
            token: 'checkout_token_diff_addr',
          },
        };

        mockClient.request = vi.fn().mockResolvedValue(mockResponse);

        // Act
        await checkoutService.initialize(initializeRequest);

        // Assert
        const [callArgs] = (mockClient.request as ReturnType<typeof vi.fn>).mock
          .calls[0] as [
          { path: string; method: string; body: Record<string, unknown> }
        ];
        const customer = callArgs.body.customer as any;
        expect(customer.billingAddress.city).toBe('Istanbul');
        expect(customer.shippingAddress.city).toBe('Ankara');
        expect(customer.billingAddress.contactName).toBe('Billing Contact');
        expect(customer.shippingAddress.contactName).toBe('Shipping Contact');
      });
    });

    describe('retrieve edge cases', () => {
      test('should handle malformed token', async () => {
        // Arrange
        const token = 'malformed@#$%^&*()token';
        const validationError = new IyzicoApiError(
          'Invalid token format',
          400,
          {
            status: 'failure',
            errorMessage: 'Invalid token format',
            errorCode: 'INVALID_TOKEN_FORMAT',
          }
        );
        mockClient.request = vi.fn().mockRejectedValue(validationError);

        // Act & Assert
        await expect(checkoutService.retrieve(token)).rejects.toThrow(
          'Invalid token format'
        );
      });

      test('should handle very long token', async () => {
        // Arrange
        const token = 'A'.repeat(1000);
        const validationError = new IyzicoApiError('Token too long', 400, {
          status: 'failure',
          errorMessage: 'Token too long',
          errorCode: 'TOKEN_TOO_LONG',
        });
        mockClient.request = vi.fn().mockRejectedValue(validationError);

        // Act & Assert
        await expect(checkoutService.retrieve(token)).rejects.toThrow(
          'Token too long'
        );
      });

      test('should handle rate limiting error (429)', async () => {
        // Arrange
        const token = 'rate_limited_token';
        const rateLimitError = new IyzicoApiError('Rate limit exceeded', 429, {
          status: 'failure',
          errorMessage: 'Rate limit exceeded',
          errorCode: 'RATE_LIMIT_EXCEEDED',
        });

        mockClient.request = vi.fn().mockRejectedValue(rateLimitError);

        // Act & Assert
        await expect(checkoutService.retrieve(token)).rejects.toThrow(
          IyzicoApiError
        );

        try {
          await checkoutService.retrieve(token);
        } catch (error) {
          if (error instanceof IyzicoApiError) {
            expect(error.statusCode).toBe(429);
            expect(error.isRetryable()).toBe(true);
          }
        }
      });
    });
  });

  // Performance and behavior tests
  describe('performance and behavior', () => {
    test('should handle concurrent initialize requests correctly', async () => {
      // Arrange
      const requests: InitializeCheckoutRequest[] = [
        {
          name: 'User1',
          surname: 'Test1',
          email: 'user1@example.com',
          gsmNumber: '5551111111',
          identityNumber: '11111111111',
          pricingPlanReferenceCode: 'PLAN_1',
          callbackUrl: 'https://example.com/callback',
          billingAddress: {
            contactName: 'User1 Test1',
            country: 'Turkey',
            city: 'Istanbul',
            address: 'Address 1',
          },
          shippingAddress: {
            contactName: 'User1 Test1',
            country: 'Turkey',
            city: 'Istanbul',
            address: 'Address 1',
          },
        },
        {
          name: 'User2',
          surname: 'Test2',
          email: 'user2@example.com',
          gsmNumber: '5552222222',
          identityNumber: '22222222222',
          pricingPlanReferenceCode: 'PLAN_2',
          callbackUrl: 'https://example.com/callback',
          billingAddress: {
            contactName: 'User2 Test2',
            country: 'Turkey',
            city: 'Ankara',
            address: 'Address 2',
          },
          shippingAddress: {
            contactName: 'User2 Test2',
            country: 'Turkey',
            city: 'Ankara',
            address: 'Address 2',
          },
        },
        {
          name: 'User3',
          surname: 'Test3',
          email: 'user3@example.com',
          gsmNumber: '5553333333',
          identityNumber: '33333333333',
          pricingPlanReferenceCode: 'PLAN_3',
          callbackUrl: 'https://example.com/callback',
          billingAddress: {
            contactName: 'User3 Test3',
            country: 'Turkey',
            city: 'Izmir',
            address: 'Address 3',
          },
          shippingAddress: {
            contactName: 'User3 Test3',
            country: 'Turkey',
            city: 'Izmir',
            address: 'Address 3',
          },
        },
      ];

      const mockResponses = requests.map((req, index) => ({
        status: 'success',
        systemTime: 1640995200000 + index,
        data: {
          checkoutFormContent: '<html>...</html>',
          token: `checkout_token_${index + 1}`,
        },
      }));

      mockClient.request = vi
        .fn()
        .mockResolvedValueOnce(mockResponses[0])
        .mockResolvedValueOnce(mockResponses[1])
        .mockResolvedValueOnce(mockResponses[2]);

      // Act
      const promises = requests.map((req) => checkoutService.initialize(req));
      const results = await Promise.all(promises);

      // Assert
      expect(results).toHaveLength(3);
      expect(mockClient.request).toHaveBeenCalledTimes(3);
      results.forEach((result, index) => {
        expect(result.data?.token).toBe(`checkout_token_${index + 1}`);
      });
    });

    test('should handle method chaining correctly', async () => {
      // Arrange
      const initializeRequest: InitializeCheckoutRequest = {
        name: 'Chain',
        surname: 'Test',
        email: 'chain.test@example.com',
        gsmNumber: '5554444444',
        identityNumber: '44444444444',
        pricingPlanReferenceCode: 'PLAN_CHAIN',
        callbackUrl: 'https://example.com/callback',
        billingAddress: {
          contactName: 'Chain Test',
          country: 'Turkey',
          city: 'Istanbul',
          address: 'Test Address',
        },
        shippingAddress: {
          contactName: 'Chain Test',
          country: 'Turkey',
          city: 'Istanbul',
          address: 'Test Address',
        },
      };

      const initializeResponse: CheckoutFormResponse = {
        status: 'success',
        systemTime: 1640995200000,
        data: {
          checkoutFormContent: '<html>...</html>',
          token: 'checkout_token_chain',
        },
      };

      const retrieveResponse = {
        status: 'success',
        systemTime: 1640995200000,
        data: {
          checkoutFormContent: '<html>...</html>',
          token: 'checkout_token_chain',
          paymentPageUrl: 'https://sandbox-api.iyzipay.com/checkout',
        },
      };

      mockClient.request = vi
        .fn()
        .mockResolvedValueOnce(initializeResponse) // For initialize
        .mockResolvedValueOnce(retrieveResponse); // For retrieve

      // Act
      const initResult = await checkoutService.initialize(initializeRequest);
      const retrieveResult = await checkoutService.retrieve(
        initResult.data!.token
      );

      // Assert
      expect(initResult.data?.token).toBe('checkout_token_chain');
      expect(retrieveResult.data?.token).toBe('checkout_token_chain');
      expect(retrieveResult.data?.paymentPageUrl).toBe(
        'https://sandbox-api.iyzipay.com/checkout'
      );
      expect(mockClient.request).toHaveBeenCalledTimes(2);
    });

    test('should handle sequential operations', async () => {
      // Arrange
      const tokens = ['token_1', 'token_2', 'token_3'];
      const mockResponses = tokens.map((token) => ({
        status: 'success',
        systemTime: 1640995200000,
        data: {
          checkoutFormContent: '<html>...</html>',
          token: token,
        },
      }));

      mockClient.request = vi
        .fn()
        .mockResolvedValueOnce(mockResponses[0])
        .mockResolvedValueOnce(mockResponses[1])
        .mockResolvedValueOnce(mockResponses[2]);

      // Act
      const results: CheckoutFormResponse[] = [];
      for (const token of tokens) {
        const result = await checkoutService.retrieve(token);
        results.push(result);
      }

      // Assert
      expect(results).toHaveLength(3);
      expect(mockClient.request).toHaveBeenCalledTimes(3);
      results.forEach((result, index) => {
        expect(result.data?.token).toBe(tokens[index]);
      });
    });
  });
});
