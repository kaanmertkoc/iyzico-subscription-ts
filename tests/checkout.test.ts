import { beforeEach, describe, expect, test, vi } from 'vitest';
import { IYZICO_SANDBOX_BASE_URL, type IyzicoClient } from '../src/client';
import { IyzicoApiError, IyzicoNetworkError } from '../src/error';
import { CheckoutService } from '../src/services/checkout';
import type {
  InitializeCheckoutRequest,
  InitializeSubscriptionRequest,
  CardUpdateRequest,
  CheckoutFormResponse,
  CheckoutFormData,
  InitializeSubscriptionResponse,
  SubscriptionInitData,
  PaymentCard,
} from '../src/types';
import { BaseCustomer, type BaseResponse } from '../src/types/core';

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
      expect((callArgs.body.customer as BaseCustomer).gsmNumber).toBe(
        '+905551234567'
      );
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
      expect((callArgs.body.customer as BaseCustomer).gsmNumber).toBe(
        '+905559876543'
      );
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

    test('should handle clientReferenceId when provided', async () => {
      // Arrange
      const initializeRequest: InitializeCheckoutRequest = {
        name: 'Reference',
        surname: 'Test',
        email: 'reference.test@example.com',
        gsmNumber: '5551234567',
        identityNumber: '10101010101',
        pricingPlanReferenceCode: 'PLAN_REF',
        callbackUrl: 'https://example.com/callback',
        clientReferenceId: 'custom_ref_12345',
        billingAddress: {
          contactName: 'Reference Test',
          country: 'Turkey',
          city: 'Istanbul',
          address: 'Test Address',
        },
        shippingAddress: {
          contactName: 'Reference Test',
          country: 'Turkey',
          city: 'Istanbul',
          address: 'Test Address',
        },
      };

      const mockResponse: CheckoutFormResponse = {
        status: 'success',
        systemTime: 1640995200000,
        data: {
          checkoutFormContent: '<html>...</html>',
          token: 'checkout_token_ref',
        },
      };

      mockClient.request = vi.fn().mockResolvedValue(mockResponse);

      // Act
      const result = await checkoutService.initialize(initializeRequest);

      // Assert
      expect(result.clientReferenceId).toBe('custom_ref_12345');
      expect(result.status).toBe('success');
    });

    test('should handle missing clientReferenceId gracefully', async () => {
      // Arrange
      const initializeRequest: InitializeCheckoutRequest = {
        name: 'NoRef',
        surname: 'Test',
        email: 'noref.test@example.com',
        gsmNumber: '5551234567',
        identityNumber: '20202020202',
        pricingPlanReferenceCode: 'PLAN_NOREF',
        callbackUrl: 'https://example.com/callback',
        // clientReferenceId is intentionally omitted
        billingAddress: {
          contactName: 'NoRef Test',
          country: 'Turkey',
          city: 'Istanbul',
          address: 'Test Address',
        },
        shippingAddress: {
          contactName: 'NoRef Test',
          country: 'Turkey',
          city: 'Istanbul',
          address: 'Test Address',
        },
      };

      const mockResponse: CheckoutFormResponse = {
        status: 'success',
        systemTime: 1640995200000,
        data: {
          checkoutFormContent: '<html>...</html>',
          token: 'checkout_token_noref',
        },
      };

      mockClient.request = vi.fn().mockResolvedValue(mockResponse);

      // Act
      const result = await checkoutService.initialize(initializeRequest);

      // Assert
      expect(result.clientReferenceId).toBeUndefined();
      expect(result.status).toBe('success');
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
      expect(
        (callArgs.body.customer as BaseCustomer).billingAddress?.zipCode
      ).toBe('34000');
      expect(
        (callArgs.body.customer as BaseCustomer).shippingAddress?.zipCode
      ).toBe('34001');
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

    test('should retrieve checkout form result with subscription data', async () => {
      // Arrange
      const token = 'token_subscription_data';
      const mockSubscriptionData: SubscriptionInitData = {
        referenceCode: 'sub_123',
        parentReferenceCode: 'parent_123',
        pricingPlanReferenceCode: 'PLAN_123',
        customerReferenceCode: 'customer_123',
        subscriptionStatus: 'ACTIVE',
        createdDate: 1640995200000,
        startDate: 1640995200000,
      };

      const expectedResponse = {
        status: 'success',
        systemTime: 1640995200000,
        data: mockSubscriptionData,
      };

      mockClient.request = vi.fn().mockResolvedValue(expectedResponse);

      // Act
      const result = await checkoutService.retrieve(token);

      // Assert
      expect(result.data?.referenceCode).toBe('sub_123');
      expect(result.data?.subscriptionStatus).toBe('ACTIVE');
    });

    test('should return stored clientReferenceId when retrieving checkout', async () => {
      // Arrange - First initialize with clientReferenceId
      const initializeRequest: InitializeCheckoutRequest = {
        name: 'Retrieve',
        surname: 'Test',
        email: 'retrieve.test@example.com',
        gsmNumber: '5551234567',
        identityNumber: '30303030303',
        pricingPlanReferenceCode: 'PLAN_RETRIEVE',
        callbackUrl: 'https://example.com/callback',
        clientReferenceId: 'retrieve_ref_123',
        billingAddress: {
          contactName: 'Retrieve Test',
          country: 'Turkey',
          city: 'Istanbul',
          address: 'Test Address',
        },
        shippingAddress: {
          contactName: 'Retrieve Test',
          country: 'Turkey',
          city: 'Istanbul',
          address: 'Test Address',
        },
      };

      const initResponse: CheckoutFormResponse = {
        status: 'success',
        systemTime: 1640995200000,
        data: {
          checkoutFormContent: '<html>...</html>',
          token: 'checkout_token_retrieve_ref',
        },
      };

      const mockSubscriptionData: SubscriptionInitData = {
        referenceCode: 'sub_retrieve_123',
        parentReferenceCode: 'parent_retrieve_123',
        pricingPlanReferenceCode: 'PLAN_RETRIEVE',
        customerReferenceCode: 'customer_retrieve_123',
        subscriptionStatus: 'ACTIVE',
        createdDate: 1640995200000,
        startDate: 1640995200000,
      };

      const retrieveResponse = {
        status: 'success',
        systemTime: 1640995200000,
        data: mockSubscriptionData,
      };

      mockClient.request = vi
        .fn()
        .mockResolvedValueOnce(initResponse)
        .mockResolvedValueOnce(retrieveResponse);

      // Act - Initialize first to store the clientReferenceId
      await checkoutService.initialize(initializeRequest);
      
      // Then retrieve
      const result = await checkoutService.retrieve(
        initResponse.data!.token
      );

      // Assert
      expect(result.clientReferenceId).toBe('retrieve_ref_123');
      expect(result.data?.referenceCode).toBe('sub_retrieve_123');
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

  describe('initializeSubscription', () => {
    test('should initialize subscription via NON-3DS with payment card', async () => {
      // Arrange
      const subscriptionRequest: InitializeSubscriptionRequest = {
        name: 'John',
        surname: 'Doe',
        email: 'john.doe@example.com',
        gsmNumber: '5551234567',
        identityNumber: '11111111111',
        pricingPlanReferenceCode: 'PLAN_123',
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
        paymentCard: {
          cardHolderName: 'John Doe',
          cardNumber: '5528790000000008',
          expireYear: '2030',
          expireMonth: '12',
          cvc: '123',
          registerConsumerCard: true,
        },
      };

      const mockSubscriptionData: SubscriptionInitData = {
        referenceCode: 'sub_abc123',
        parentReferenceCode: 'parent_abc123',
        pricingPlanReferenceCode: 'PLAN_123',
        customerReferenceCode: 'customer_xyz789',
        subscriptionStatus: 'ACTIVE',
        trialDays: 30,
        trialStartDate: 1640995200000,
        trialEndDate: 1643587200000,
        createdDate: 1640995200000,
        startDate: 1640995200000,
        endDate: 1672531200000,
      };

      const expectedResponse: InitializeSubscriptionResponse = {
        status: 'success',
        systemTime: 1640995200000,
        data: mockSubscriptionData,
      };

      mockClient.request = vi.fn().mockResolvedValue(expectedResponse);

      // Act
      const result = await checkoutService.initializeSubscription(
        subscriptionRequest
      );

      // Assert
      expect(result).toEqual(expectedResponse);
      expect(mockClient.request).toHaveBeenCalledOnce();
      expect(mockClient.request).toHaveBeenCalledWith({
        path: '/v2/subscription/initialize',
        method: 'POST',
        body: expect.objectContaining({
          locale: 'tr',
          conversationId: expect.stringMatching(/^subscription-\d+$/),
          pricingPlanReferenceCode: 'PLAN_123',
          subscriptionInitialStatus: 'ACTIVE',
          customer: expect.objectContaining({
            name: 'John',
            surname: 'Doe',
            email: 'john.doe@example.com',
            gsmNumber: '+905551234567',
            identityNumber: '11111111111',
            billingAddress: expect.any(Object),
            shippingAddress: expect.any(Object),
          }),
          paymentCard: expect.objectContaining({
            cardHolderName: 'John Doe',
            cardNumber: '5528790000000008',
            registerConsumerCard: true,
          }),
        }),
      });
    });

    test('should initialize subscription with stored card tokens', async () => {
      // Arrange
      const subscriptionRequest: InitializeSubscriptionRequest = {
        name: 'Jane',
        surname: 'Smith',
        email: 'jane.smith@example.com',
        gsmNumber: '+905559876543',
        identityNumber: '22222222222',
        pricingPlanReferenceCode: 'PLAN_456',
        subscriptionInitialStatus: 'PENDING',
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
        paymentCard: {
          cardToken: 'card_token_xyz',
          consumerToken: 'consumer_token_abc',
          ucsToken: 'ucs_token_def',
        },
      };

      const mockResponse: InitializeSubscriptionResponse = {
        status: 'success',
        systemTime: 1640995200000,
        data: {
          referenceCode: 'sub_stored_card',
          parentReferenceCode: 'parent_stored',
          pricingPlanReferenceCode: 'PLAN_456',
          customerReferenceCode: 'customer_stored',
          subscriptionStatus: 'PENDING',
          createdDate: 1640995200000,
          startDate: 1640995200000,
        },
      };

      mockClient.request = vi.fn().mockResolvedValue(mockResponse);

      // Act
      const result = await checkoutService.initializeSubscription(
        subscriptionRequest
      );

      // Assert
      expect(result.data?.subscriptionStatus).toBe('PENDING');
      const [callArgs] = (mockClient.request as ReturnType<typeof vi.fn>).mock
        .calls[0] as [
        { path: string; method: string; body: Record<string, unknown> }
      ];

      // Verify customer object is wrapped correctly
      expect(callArgs.body.customer).toBeDefined();
      expect((callArgs.body.customer as BaseCustomer).name).toBe('Jane');
      expect((callArgs.body.customer as BaseCustomer).surname).toBe('Smith');
      expect((callArgs.body.customer as BaseCustomer).email).toBe(
        'jane.smith@example.com'
      );
      expect((callArgs.body.customer as BaseCustomer).gsmNumber).toBe(
        '+905559876543'
      );

      // Verify payment card tokens
      expect((callArgs.body.paymentCard as PaymentCard).cardToken).toBe(
        'card_token_xyz'
      );
      expect((callArgs.body.paymentCard as PaymentCard).consumerToken).toBe(
        'consumer_token_abc'
      );
      expect((callArgs.body.paymentCard as PaymentCard).ucsToken).toBe(
        'ucs_token_def'
      );
    });

    test('should return clientReferenceId when provided in initializeSubscription', async () => {
      // Arrange
      const subscriptionRequest: InitializeSubscriptionRequest = {
        name: 'Jane',
        surname: 'Doe',
        email: 'jane.doe@example.com',
        gsmNumber: '5551234567',
        identityNumber: '11111111111',
        pricingPlanReferenceCode: 'PLAN_REF_123',
        clientReferenceId: 'subscription_ref_xyz',
        billingAddress: {
          contactName: 'Jane Doe',
          country: 'Turkey',
          city: 'Istanbul',
          address: 'Test Address 123',
        },
        shippingAddress: {
          contactName: 'Jane Doe',
          country: 'Turkey',
          city: 'Istanbul',
          address: 'Test Address 123',
        },
        paymentCard: {
          cardHolderName: 'Jane Doe',
          cardNumber: '5528790000000008',
          expireYear: '2030',
          expireMonth: '12',
          cvc: '123',
        },
      };

      const mockSubscriptionData: SubscriptionInitData = {
        referenceCode: 'sub_ref_123',
        parentReferenceCode: 'parent_ref_123',
        pricingPlanReferenceCode: 'PLAN_REF_123',
        customerReferenceCode: 'customer_ref_xyz',
        subscriptionStatus: 'ACTIVE',
        createdDate: 1640995200000,
        startDate: 1640995200000,
      };

      const expectedResponse: InitializeSubscriptionResponse = {
        status: 'success',
        systemTime: 1640995200000,
        data: mockSubscriptionData,
      };

      mockClient.request = vi.fn().mockResolvedValue(expectedResponse);

      // Act
      const result = await checkoutService.initializeSubscription(
        subscriptionRequest
      );

      // Assert
      expect(result.clientReferenceId).toBe('subscription_ref_xyz');
      expect(result.status).toBe('success');
    });

    test('should handle subscription initialization errors', async () => {
      // Arrange
      const subscriptionRequest: InitializeSubscriptionRequest = {
        name: 'Error',
        surname: 'Test',
        email: 'error@test.com',
        gsmNumber: '5551234567',
        identityNumber: '11111111111',
        pricingPlanReferenceCode: 'INVALID_PLAN',
        billingAddress: {
          contactName: 'Error Test',
          country: 'Turkey',
          city: 'Istanbul',
          address: 'Test',
        },
        shippingAddress: {
          contactName: 'Error Test',
          country: 'Turkey',
          city: 'Istanbul',
          address: 'Test',
        },
        paymentCard: {
          cardNumber: '0000000000000000',
          expireMonth: '01',
          expireYear: '2020',
          cvc: '000',
        },
      };

      const apiError = new IyzicoApiError('Invalid card or expired', 400, {
        status: 'failure',
        errorMessage: 'Invalid card or expired',
        errorCode: 'INVALID_CARD',
      });
      mockClient.request = vi.fn().mockRejectedValue(apiError);

      // Act & Assert
      await expect(
        checkoutService.initializeSubscription(subscriptionRequest)
      ).rejects.toThrow(IyzicoApiError);
    });
  });

  describe('initializeCardUpdate', () => {
    test('should initialize card update checkout form', async () => {
      // Arrange
      const cardUpdateRequest: CardUpdateRequest = {
        subscriptionReferenceCode: 'sub_abc123',
        callbackUrl: 'https://example.com/card-update-callback',
      };

      const mockResponse: CheckoutFormResponse = {
        status: 'success',
        systemTime: 1640995200000,
        checkoutFormContent: '<script>...</script>',
        token: 'card_update_token_xyz',
        tokenExpireTime: 1800,
      };

      mockClient.request = vi.fn().mockResolvedValue(mockResponse);

      // Act
      const result = await checkoutService.initializeCardUpdate(
        cardUpdateRequest
      );

      // Assert
      expect(result).toEqual(mockResponse);
      expect(mockClient.request).toHaveBeenCalledOnce();
      expect(mockClient.request).toHaveBeenCalledWith({
        path: '/v2/subscription/card-update/checkoutform/initialize',
        method: 'POST',
        body: {
          locale: 'tr',
          conversationId: expect.stringMatching(/^card-update-\d+$/),
          subscriptionReferenceCode: 'sub_abc123',
          callbackUrl: 'https://example.com/card-update-callback',
        },
      });
    });

    test('should handle custom locale and conversationId for card update', async () => {
      // Arrange
      const cardUpdateRequest: CardUpdateRequest = {
        subscriptionReferenceCode: 'sub_custom',
        callbackUrl: 'https://example.com/callback',
        locale: 'en',
        conversationId: 'custom-card-update-id',
      };

      const mockResponse: CheckoutFormResponse = {
        status: 'success',
        systemTime: 1640995200000,
        token: 'card_update_custom',
        tokenExpireTime: 1800,
      };

      mockClient.request = vi.fn().mockResolvedValue(mockResponse);

      // Act
      await checkoutService.initializeCardUpdate(cardUpdateRequest);

      // Assert
      expect(mockClient.request).toHaveBeenCalledWith({
        path: '/v2/subscription/card-update/checkoutform/initialize',
        method: 'POST',
        body: {
          locale: 'en',
          conversationId: 'custom-card-update-id',
          subscriptionReferenceCode: 'sub_custom',
          callbackUrl: 'https://example.com/callback',
        },
      });
    });

    test('should handle card update errors', async () => {
      // Arrange
      const cardUpdateRequest: CardUpdateRequest = {
        subscriptionReferenceCode: 'invalid_sub',
        callbackUrl: 'https://example.com/callback',
      };

      const apiError = new IyzicoApiError('Subscription not found', 404, {
        status: 'failure',
        errorMessage: 'Subscription not found',
        errorCode: 'SUBSCRIPTION_NOT_FOUND',
      });
      mockClient.request = vi.fn().mockRejectedValue(apiError);

      // Act & Assert
      await expect(
        checkoutService.initializeCardUpdate(cardUpdateRequest)
      ).rejects.toThrow(IyzicoApiError);
      expect(mockClient.request).toHaveBeenCalledOnce();
    });

    test('should handle invalid callback URL for card update', async () => {
      // Arrange
      const cardUpdateRequest: CardUpdateRequest = {
        subscriptionReferenceCode: 'sub_123',
        callbackUrl: 'not-a-valid-url',
      };

      const validationError = new IyzicoApiError('Invalid callback URL', 400, {
        status: 'failure',
        errorMessage: 'Invalid callback URL',
        errorCode: 'INVALID_CALLBACK_URL',
      });
      mockClient.request = vi.fn().mockRejectedValue(validationError);

      // Act & Assert
      await expect(
        checkoutService.initializeCardUpdate(cardUpdateRequest)
      ).rejects.toThrow('Invalid callback URL');
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
        const customer = callArgs.body.customer as BaseCustomer;
        expect(customer.billingAddress?.city).toBe('Istanbul');
        expect(customer.shippingAddress?.city).toBe('Ankara');
        expect(customer.billingAddress?.contactName).toBe('Billing Contact');
        expect(customer.shippingAddress?.contactName).toBe('Shipping Contact');
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
          referenceCode: 'sub_chain_123',
          parentReferenceCode: 'parent_chain_123',
          pricingPlanReferenceCode: 'PLAN_CHAIN',
          customerReferenceCode: 'customer_chain_123',
          subscriptionStatus: 'ACTIVE',
          createdDate: 1640995200000,
          startDate: 1640995200000,
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
      expect(retrieveResult.data?.referenceCode).toBe('sub_chain_123');
      expect(retrieveResult.data?.subscriptionStatus).toBe('ACTIVE');
      expect(mockClient.request).toHaveBeenCalledTimes(2);
    });

    test('should handle sequential operations', async () => {
      // Arrange
      const tokens = ['token_1', 'token_2', 'token_3'];
      const mockResponses = tokens.map((token, index) => ({
        status: 'success',
        systemTime: 1640995200000,
        data: {
          referenceCode: `sub_${index + 1}`,
          parentReferenceCode: `parent_${index + 1}`,
          pricingPlanReferenceCode: `PLAN_${index + 1}`,
          customerReferenceCode: `customer_${index + 1}`,
          subscriptionStatus: 'ACTIVE',
          createdDate: 1640995200000,
          startDate: 1640995200000,
        },
      }));

      mockClient.request = vi
        .fn()
        .mockResolvedValueOnce(mockResponses[0])
        .mockResolvedValueOnce(mockResponses[1])
        .mockResolvedValueOnce(mockResponses[2]);

      // Act
      const results: BaseResponse<SubscriptionInitData>[] = [];
      for (const token of tokens) {
        const result = await checkoutService.retrieve(token);
        results.push(result);
      }

      // Assert
      expect(results).toHaveLength(3);
      expect(mockClient.request).toHaveBeenCalledTimes(3);
      results.forEach((result, index) => {
        expect(result.data?.referenceCode).toBe(`sub_${index + 1}`);
      });
    });
  });
});
