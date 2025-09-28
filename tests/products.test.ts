import { beforeEach, describe, expect, test, vi } from 'vitest';
import { type IyzicoClient } from '../src/client';
import { ProductsService } from '../src/services/products';
import type {
  CreateProductRequest,
  CreateProductResponse,
  ProductData,
  UpdateProductResponse,
} from '../src/types';
import { CurrencyCode, PaymentInterval, Status } from '../src/types/core';
import { PlanPaymentType } from '../src/types/plans';
import { IyzicoApiError, IyzicoNetworkError } from '../src/error';
// Create a mock client
const mockClient = {
  request: vi.fn(),
} as unknown as IyzicoClient;

describe('ProductsService', () => {
  let productsService: ProductsService;

  beforeEach(() => {
    productsService = new ProductsService(mockClient);
    vi.clearAllMocks();
  });

  describe('create', () => {
    test('should make successful product creation request', async () => {
      // Arrange
      const createRequest: CreateProductRequest = {
        name: 'Premium Subscription',
        description: 'Monthly premium subscription plan',
      };

      const mockProductData: ProductData = {
        referenceCode: 'PROD_123456',
        createdDate: 1640995200000,
        name: 'Premium Subscription',
        description: 'Monthly premium subscription plan',
        status: 'ACTIVE',
        pricingPlans: [],
      };

      const expectedResponse: CreateProductResponse = {
        status: 'success',
        systemTime: 1640995200000,
        data: mockProductData,
      };

      mockClient.request = vi.fn().mockResolvedValue(expectedResponse);

      // Act
      const result = await productsService.create(createRequest);

      // Assert
      expect(result).toEqual(expectedResponse);
      expect(mockClient.request).toHaveBeenCalledOnce();
      expect(mockClient.request).toHaveBeenCalledWith({
        path: '/v2/subscription/products',
        method: 'POST',
        body: {
          locale: 'tr',
          conversationId: expect.stringMatching(/^product-create-\d+$/),
          name: 'Premium Subscription',
          description: 'Monthly premium subscription plan',
        },
      });
    });

    test('should merge default parameters with provided parameters', async () => {
      // Arrange
      const createRequest: CreateProductRequest = {
        name: 'Basic Plan',
        description: 'Basic subscription plan',
        conversationId: 'custom-conversation-id', // This should override the default
      };

      const mockResponse: CreateProductResponse = {
        status: 'success',
        systemTime: 1640995200000,
        data: {
          referenceCode: 'PROD_789',
          createdDate: 1640995200000,
          name: 'Basic Plan',
          description: 'Basic subscription plan',
          status: 'ACTIVE',
          pricingPlans: [],
        },
      };

      mockClient.request = vi.fn().mockResolvedValue(mockResponse);

      // Act
      await productsService.create(createRequest);

      // Assert
      expect(mockClient.request).toHaveBeenCalledWith({
        path: '/v2/subscription/products',
        method: 'POST',
        body: {
          locale: 'tr', // Default value
          conversationId: 'custom-conversation-id', // Custom value should override default
          name: 'Basic Plan',
          description: 'Basic subscription plan',
        },
      });
    });

    test('should preserve custom locale when provided', async () => {
      // Arrange
      const createRequest: CreateProductRequest = {
        name: 'Enterprise Plan',
        description: 'Enterprise subscription plan',
        locale: 'en', // Custom locale
      };

      const mockResponse: CreateProductResponse = {
        status: 'success',
        systemTime: 1640995200000,
        data: {
          referenceCode: 'PROD_ENT',
          createdDate: 1640995200000,
          name: 'Enterprise Plan',
          description: 'Enterprise subscription plan',
          status: 'ACTIVE',
          pricingPlans: [],
        },
      };

      mockClient.request = vi.fn().mockResolvedValue(mockResponse);

      // Act
      await productsService.create(createRequest);

      // Assert
      expect(mockClient.request).toHaveBeenCalledWith({
        path: '/v2/subscription/products',
        method: 'POST',
        body: {
          locale: 'en', // Should use custom locale, not default 'tr'
          conversationId: expect.stringMatching(/^product-create-\d+$/),
          name: 'Enterprise Plan',
          description: 'Enterprise subscription plan',
        },
      });
    });

    test('should generate dynamic conversationId with current timestamp', async () => {
      // Arrange
      const createRequest: CreateProductRequest = {
        name: 'Test Product',
        description: 'Test description',
      };

      const mockResponse: CreateProductResponse = {
        status: 'success',
        systemTime: 1640995200000,
        data: {
          referenceCode: 'PROD_TEST',
          createdDate: 1640995200000,
          name: 'Test Product',
          description: 'Test description',
          status: 'ACTIVE',
          pricingPlans: [],
        },
      };

      mockClient.request = vi.fn().mockResolvedValue(mockResponse);
      const beforeTime = Date.now();

      // Act
      await productsService.create(createRequest);
      const afterTime = Date.now();

      // Assert
      const [callArgs] = (mockClient.request as ReturnType<typeof vi.fn>).mock
        .calls[0] as [
        { path: string; method: string; body: Record<string, unknown> },
      ];
      const conversationId = callArgs.body.conversationId as string;

      expect(conversationId).toMatch(/^product-create-\d+$/);

      // Extract timestamp from conversationId and verify it's recent
      const timestamp = parseInt(conversationId.replace('product-create-', ''));
      expect(timestamp).toBeGreaterThanOrEqual(beforeTime);
      expect(timestamp).toBeLessThanOrEqual(afterTime);
    });

    test('should handle API errors gracefully', async () => {
      // Arrange
      const createRequest: CreateProductRequest = {
        name: '', // Invalid empty name
        description: 'Invalid product',
      };

      const apiError = new Error('Product name cannot be empty');
      mockClient.request = vi.fn().mockRejectedValue(apiError);

      // Act & Assert
      await expect(productsService.create(createRequest)).rejects.toThrow(
        'Product name cannot be empty'
      );

      expect(mockClient.request).toHaveBeenCalledOnce();
      expect(mockClient.request).toHaveBeenCalledWith({
        path: '/v2/subscription/products',
        method: 'POST',
        body: {
          locale: 'tr',
          conversationId: expect.stringMatching(/^product-create-\d+$/),
          name: '',
          description: 'Invalid product',
        },
      });
    });

    test('should handle network errors', async () => {
      // Arrange
      const createRequest: CreateProductRequest = {
        name: 'Network Test Product',
        description: 'Testing network failure',
      };

      const networkError = new Error('Network timeout');
      mockClient.request = vi.fn().mockRejectedValue(networkError);

      // Act & Assert
      await expect(productsService.create(createRequest)).rejects.toThrow(
        'Network timeout'
      );

      expect(mockClient.request).toHaveBeenCalledOnce();
    });

    test('should work with complex product data', async () => {
      // Arrange - Test with more complex/realistic data
      const createRequest: CreateProductRequest = {
        name: 'Premium Business Package',
        description: 'Comprehensive business solution with advanced features',
        conversationId: 'business-flow-2024',
      };

      const mockResponse: CreateProductResponse = {
        status: 'success',
        systemTime: 1704067200000, // 2024-01-01
        data: {
          referenceCode: 'PROD_PREMIUM_BIZ_001',
          createdDate: 1704067200000,
          name: 'Premium Business Package',
          description: 'Comprehensive business solution with advanced features',
          status: 'ACTIVE',
          pricingPlans: [],
        },
      };

      mockClient.request = vi.fn().mockResolvedValue(mockResponse);

      // Act
      const result = await productsService.create(createRequest);

      // Assert
      expect(result.data?.referenceCode).toBe('PROD_PREMIUM_BIZ_001');
      expect(result.data?.name).toBe('Premium Business Package');
      expect(result.data?.status).toBe('ACTIVE');
      expect(mockClient.request).toHaveBeenCalledWith({
        path: '/v2/subscription/products',
        method: 'POST',
        body: {
          locale: 'tr',
          conversationId: 'business-flow-2024',
          name: 'Premium Business Package',
          description: 'Comprehensive business solution with advanced features',
        },
      });
    });
  });

  describe('update', () => {
    test('should make successful product update request', async () => {
      // Arrange
      const referenceCode = 'PROD_123';
      const updateRequest = {
        name: 'Updated Premium Subscription',
        description: 'Updated monthly premium subscription plan',
      };

      const mockProductData: ProductData = {
        referenceCode: 'PROD_123',
        createdDate: 1640995200000,
        name: 'Updated Premium Subscription',
        description: 'Updated monthly premium subscription plan',
        status: 'ACTIVE',
        pricingPlans: [],
      };

      const expectedResponse: CreateProductResponse = {
        status: 'success',
        systemTime: 1640995200000,
        data: mockProductData,
      };

      mockClient.request = vi.fn().mockResolvedValue(expectedResponse);

      // Act
      const result = await productsService.update(referenceCode, updateRequest);

      // Assert
      expect(result).toEqual(expectedResponse);
      expect(mockClient.request).toHaveBeenCalledOnce();
      expect(mockClient.request).toHaveBeenCalledWith({
        path: '/v2/subscription/products/PROD_123',
        method: 'POST',
        body: {
          locale: 'tr',
          conversationId: expect.stringMatching(/^product-update-\d+$/),
          productReferenceCode: 'PROD_123',
          name: 'Updated Premium Subscription',
          description: 'Updated monthly premium subscription plan',
        },
      });
    });

    test('should merge default parameters with provided parameters', async () => {
      // Arrange
      const referenceCode = 'PROD_456';
      const updateRequest = {
        name: 'Updated Basic Plan',
        description: 'Updated basic subscription plan',
        conversationId: 'custom-update-id', // This should override the default
        locale: 'en', // This should override the default
      };

      const mockResponse: CreateProductResponse = {
        status: 'success',
        systemTime: 1640995200000,
        data: {
          referenceCode: 'PROD_456',
          createdDate: 1640995200000,
          name: 'Updated Basic Plan',
          description: 'Updated basic subscription plan',
          status: 'ACTIVE',
          pricingPlans: [],
        },
      };

      mockClient.request = vi.fn().mockResolvedValue(mockResponse);

      // Act
      await productsService.update(referenceCode, updateRequest);

      // Assert
      expect(mockClient.request).toHaveBeenCalledWith({
        path: '/v2/subscription/products/PROD_456',
        method: 'POST',
        body: {
          locale: 'en', // Custom value should override default
          conversationId: 'custom-update-id', // Custom value should override default
          productReferenceCode: 'PROD_456',
          name: 'Updated Basic Plan',
          description: 'Updated basic subscription plan',
        },
      });
    });

    test('should generate dynamic conversationId with current timestamp', async () => {
      // Arrange
      const referenceCode = 'PROD_TEST';
      const updateRequest = {
        name: 'Test Product Updated',
        description: 'Test description updated',
      };

      const mockResponse: CreateProductResponse = {
        status: 'success',
        systemTime: 1640995200000,
        data: {
          referenceCode: 'PROD_TEST',
          createdDate: 1640995200000,
          name: 'Test Product Updated',
          description: 'Test description updated',
          status: 'ACTIVE',
          pricingPlans: [],
        },
      };

      mockClient.request = vi.fn().mockResolvedValue(mockResponse);
      const beforeTime = Date.now();

      // Act
      await productsService.update(referenceCode, updateRequest);
      const afterTime = Date.now();

      // Assert
      const [callArgs] = (mockClient.request as ReturnType<typeof vi.fn>).mock
        .calls[0] as [
        { path: string; method: string; body: Record<string, unknown> },
      ];
      const conversationId = callArgs.body.conversationId as string;

      expect(conversationId).toMatch(/^product-update-\d+$/);

      // Extract timestamp from conversationId and verify it's recent
      const timestamp = parseInt(conversationId.replace('product-update-', ''));
      expect(timestamp).toBeGreaterThanOrEqual(beforeTime);
      expect(timestamp).toBeLessThanOrEqual(afterTime);
    });

    test('should handle API errors gracefully', async () => {
      // Arrange
      const referenceCode = 'PROD_INVALID';
      const updateRequest = {
        name: '', // Invalid empty name
        description: 'Invalid update',
      };

      const apiError = new Error('Product name cannot be empty');
      mockClient.request = vi.fn().mockRejectedValue(apiError);

      // Act & Assert
      await expect(
        productsService.update(referenceCode, updateRequest)
      ).rejects.toThrow('Product name cannot be empty');

      expect(mockClient.request).toHaveBeenCalledOnce();
    });

    test('should handle product not found error', async () => {
      // Arrange
      const referenceCode = 'PROD_NOT_EXISTS';
      const updateRequest = {
        name: 'Valid Name',
        description: 'Valid description',
      };

      const notFoundError = new Error('Product not found');
      mockClient.request = vi.fn().mockRejectedValue(notFoundError);

      // Act & Assert
      await expect(
        productsService.update(referenceCode, updateRequest)
      ).rejects.toThrow('Product not found');
    });
  });

  describe('delete', () => {
    test('should make successful product deletion request', async () => {
      // Arrange
      const referenceCode = 'PROD_TO_DELETE';
      const expectedResponse = {
        status: 'success',
        systemTime: 1640995200000,
      };

      mockClient.request = vi.fn().mockResolvedValue(expectedResponse);

      // Act
      const result = await productsService.delete(referenceCode);

      // Assert
      expect(result).toEqual(expectedResponse);
      expect(mockClient.request).toHaveBeenCalledOnce();
      expect(mockClient.request).toHaveBeenCalledWith({
        path: '/v2/subscription/products/PROD_TO_DELETE',
        method: 'DELETE',
      });
    });

    test('should handle product not found during deletion', async () => {
      // Arrange
      const referenceCode = 'PROD_NOT_EXISTS';
      const notFoundError = new Error('Product not found');
      mockClient.request = vi.fn().mockRejectedValue(notFoundError);

      // Act & Assert
      await expect(productsService.delete(referenceCode)).rejects.toThrow(
        'Product not found'
      );

      expect(mockClient.request).toHaveBeenCalledWith({
        path: '/v2/subscription/products/PROD_NOT_EXISTS',
        method: 'DELETE',
      });
    });

    test('should handle product with active subscriptions error', async () => {
      // Arrange
      const referenceCode = 'PROD_WITH_SUBS';
      const activeSubsError = new Error(
        'Cannot delete product with active subscriptions'
      );
      mockClient.request = vi.fn().mockRejectedValue(activeSubsError);

      // Act & Assert
      await expect(productsService.delete(referenceCode)).rejects.toThrow(
        'Cannot delete product with active subscriptions'
      );
    });

    test('should handle network errors during deletion', async () => {
      // Arrange
      const referenceCode = 'PROD_NETWORK_FAIL';
      const networkError = new Error('Connection timeout');
      mockClient.request = vi.fn().mockRejectedValue(networkError);

      // Act & Assert
      await expect(productsService.delete(referenceCode)).rejects.toThrow(
        'Connection timeout'
      );
    });
  });

  describe('retrieve', () => {
    test('should make successful product retrieval request', async () => {
      // Arrange
      const referenceCode = 'PROD_RETRIEVE';
      const mockProductData: ProductData = {
        referenceCode: 'PROD_RETRIEVE',
        createdDate: 1640995200000,
        name: 'Retrieved Product',
        description: 'Product retrieved from API',
        status: 'ACTIVE',
        pricingPlans: [
          {
            referenceCode: 'PLAN_001',
            name: 'Basic Plan',
            price: 29.99,
            currencyCode: CurrencyCode.USD,
            paymentInterval: PaymentInterval.MONTHLY,
            paymentIntervalCount: 1,
            trialPeriodDays: 7,
            createdDate: 1640995200000,
            productReferenceCode: 'PROD_RETRIEVE',
            planPaymentType: PlanPaymentType.RECURRING,
            status: Status.ACTIVE,
            recurrenceCount: 0,
          },
        ],
      };

      const expectedResponse = {
        status: 'success',
        systemTime: 1640995200000,
        data: mockProductData,
      };

      mockClient.request = vi.fn().mockResolvedValue(expectedResponse);

      // Act
      const result = await productsService.retrieve(referenceCode);

      // Assert
      expect(result).toEqual(expectedResponse);
      expect(result.data?.referenceCode).toBe('PROD_RETRIEVE');
      expect(result.data?.name).toBe('Retrieved Product');
      expect(result.data?.status).toBe('ACTIVE');
      expect(result.data?.pricingPlans).toHaveLength(1);
      expect(result.data?.pricingPlans[0].name).toBe('Basic Plan');

      expect(mockClient.request).toHaveBeenCalledOnce();
      expect(mockClient.request).toHaveBeenCalledWith({
        path: '/v2/subscription/products/PROD_RETRIEVE',
        method: 'GET',
      });
    });

    test('should handle product not found during retrieval', async () => {
      // Arrange
      const referenceCode = 'PROD_NOT_EXISTS';
      const notFoundError = new Error('Product not found');
      mockClient.request = vi.fn().mockRejectedValue(notFoundError);

      // Act & Assert
      await expect(productsService.retrieve(referenceCode)).rejects.toThrow(
        'Product not found'
      );

      expect(mockClient.request).toHaveBeenCalledWith({
        path: '/v2/subscription/products/PROD_NOT_EXISTS',
        method: 'GET',
      });
    });

    test('should handle unauthorized access error', async () => {
      // Arrange
      const referenceCode = 'PROD_UNAUTHORIZED';
      const unauthorizedError = new Error('Unauthorized access');
      mockClient.request = vi.fn().mockRejectedValue(unauthorizedError);

      // Act & Assert
      await expect(productsService.retrieve(referenceCode)).rejects.toThrow(
        'Unauthorized access'
      );
    });

    test('should retrieve product with empty pricing plans', async () => {
      // Arrange
      const referenceCode = 'PROD_NO_PLANS';
      const mockProductData: ProductData = {
        referenceCode: 'PROD_NO_PLANS',
        createdDate: 1640995200000,
        name: 'Product Without Plans',
        description: 'Product with no pricing plans',
        status: 'INACTIVE',
        pricingPlans: [],
      };

      const expectedResponse = {
        status: 'success',
        systemTime: 1640995200000,
        data: mockProductData,
      };

      mockClient.request = vi.fn().mockResolvedValue(expectedResponse);

      // Act
      const result = await productsService.retrieve(referenceCode);

      // Assert
      expect(result.data?.pricingPlans).toEqual([]);
      expect(result.data?.status).toBe('INACTIVE');
    });
  });

  describe('list', () => {
    test('should make successful products list request', async () => {
      // Arrange
      const mockProductsData: ProductData[] = [
        {
          referenceCode: 'PROD_001',
          createdDate: 1640995200000,
          name: 'Basic Plan',
          description: 'Basic subscription plan',
          status: 'ACTIVE',
          pricingPlans: [],
        },
        {
          referenceCode: 'PROD_002',
          createdDate: 1640995300000,
          name: 'Premium Plan',
          description: 'Premium subscription plan',
          status: 'ACTIVE',
          pricingPlans: [],
        },
        {
          referenceCode: 'PROD_003',
          createdDate: 1640995400000,
          name: 'Enterprise Plan',
          description: 'Enterprise subscription plan',
          status: 'INACTIVE',
          pricingPlans: [],
        },
      ];

      const expectedResponse = {
        status: 'success',
        systemTime: 1640995200000,
        data: mockProductsData,
      };

      mockClient.request = vi.fn().mockResolvedValue(expectedResponse);

      // Act
      const result = await productsService.list();

      // Assert
      expect(result).toEqual(expectedResponse);
      expect(result.data).toHaveLength(3);
      expect(result.data?.[0].referenceCode).toBe('PROD_001');
      expect(result.data?.[1].referenceCode).toBe('PROD_002');
      expect(result.data?.[2].referenceCode).toBe('PROD_003');
      expect(result.data?.[2].status).toBe('INACTIVE');

      expect(mockClient.request).toHaveBeenCalledOnce();
      expect(mockClient.request).toHaveBeenCalledWith({
        path: '/v2/subscription/products',
        method: 'GET',
      });
    });

    test('should handle empty products list', async () => {
      // Arrange
      const expectedResponse = {
        status: 'success',
        systemTime: 1640995200000,
        data: [],
      };

      mockClient.request = vi.fn().mockResolvedValue(expectedResponse);

      // Act
      const result = await productsService.list();

      // Assert
      expect(result.data).toEqual([]);
      expect(result.data).toHaveLength(0);
    });

    test('should handle API errors during list operation', async () => {
      // Arrange
      const apiError = new Error('Internal server error');
      mockClient.request = vi.fn().mockRejectedValue(apiError);

      // Act & Assert
      await expect(productsService.list()).rejects.toThrow(
        'Internal server error'
      );

      expect(mockClient.request).toHaveBeenCalledOnce();
    });

    test('should handle unauthorized access during list operation', async () => {
      // Arrange
      const unauthorizedError = new Error('Invalid API credentials');
      mockClient.request = vi.fn().mockRejectedValue(unauthorizedError);

      // Act & Assert
      await expect(productsService.list()).rejects.toThrow(
        'Invalid API credentials'
      );
    });

    test('should handle network timeout during list operation', async () => {
      // Arrange
      const timeoutError = new Error('Request timeout');
      mockClient.request = vi.fn().mockRejectedValue(timeoutError);

      // Act & Assert
      await expect(productsService.list()).rejects.toThrow('Request timeout');
    });

    test('should handle products with complex pricing plans', async () => {
      // Arrange
      const mockProductsData: ProductData[] = [
        {
          referenceCode: 'PROD_COMPLEX',
          createdDate: 1640995200000,
          name: 'Complex Product',
          description: 'Product with multiple pricing plans',
          status: 'ACTIVE',
          pricingPlans: [
            {
              referenceCode: 'PLAN_MONTHLY',
              name: 'Monthly Plan',
              price: 19.99,
              currencyCode: CurrencyCode.USD,
              paymentInterval: PaymentInterval.MONTHLY,
              paymentIntervalCount: 1,
              trialPeriodDays: 14,
              createdDate: 1640995200000,
              productReferenceCode: 'PROD_COMPLEX',
              planPaymentType: PlanPaymentType.RECURRING,
              status: Status.ACTIVE,
              recurrenceCount: 0,
            },
            {
              referenceCode: 'PLAN_YEARLY',
              name: 'Yearly Plan',
              price: 199.99,
              currencyCode: CurrencyCode.USD,
              paymentInterval: PaymentInterval.YEARLY,
              paymentIntervalCount: 1,
              trialPeriodDays: 30,
              createdDate: 1640995300000,
              productReferenceCode: 'PROD_COMPLEX',
              planPaymentType: PlanPaymentType.RECURRING,
              status: Status.ACTIVE,
              recurrenceCount: 0,
            },
          ],
        },
      ];

      const expectedResponse = {
        status: 'success',
        systemTime: 1640995200000,
        data: mockProductsData,
      };

      mockClient.request = vi.fn().mockResolvedValue(expectedResponse);

      // Act
      const result = await productsService.list();

      // Assert
      expect(result.data).toHaveLength(1);
      expect(result.data?.[0].pricingPlans).toHaveLength(2);
      expect(result.data?.[0].pricingPlans[0].paymentInterval).toBe(
        PaymentInterval.MONTHLY
      );
      expect(result.data?.[0].pricingPlans[1].paymentInterval).toBe(
        PaymentInterval.YEARLY
      );
      expect(result.data?.[0].pricingPlans[0].price).toBe(19.99);
      expect(result.data?.[0].pricingPlans[1].price).toBe(199.99);
    });
  });

  // Additional comprehensive test cases for edge cases and error handling
  describe('edge cases and advanced error handling', () => {
    describe('create edge cases', () => {
      test('should handle IyzicoApiError with enhanced error context', async () => {
        // Arrange
        const createRequest: CreateProductRequest = {
          name: 'Test Product',
          description: 'Test description',
        };

        const apiError = new IyzicoApiError(
          'Product name already exists',
          400,
          {
            status: 'failure',
            errorMessage: 'Product name already exists',
            errorCode: 'DUPLICATE_PRODUCT_NAME',
            errorGroup: 'VALIDATION_ERROR',
          },
          'req_123456789',
          {
            url: 'https://api.iyzipay.com/v2/subscription/products',
            method: 'POST',
          }
        );

        mockClient.request = vi.fn().mockRejectedValue(apiError);

        // Act & Assert
        await expect(productsService.create(createRequest)).rejects.toThrow(
          IyzicoApiError
        );
        await expect(productsService.create(createRequest)).rejects.toThrow(
          'Product name already exists'
        );

        try {
          await productsService.create(createRequest);
        } catch (error) {
          expect(error).toBeInstanceOf(IyzicoApiError);
          if (error instanceof IyzicoApiError) {
            expect(error.statusCode).toBe(400);
            expect(error.errorCode).toBe('DUPLICATE_PRODUCT_NAME');
            expect(error.errorGroup).toBe('VALIDATION_ERROR');
            expect(error.requestId).toBe('req_123456789');
            expect(error.isClientError()).toBe(true);
            expect(error.isRetryable()).toBe(false);
          }
        }
      });

      test('should handle IyzicoNetworkError', async () => {
        // Arrange
        const createRequest: CreateProductRequest = {
          name: 'Test Product',
          description: 'Test description',
        };

        const networkError = new IyzicoNetworkError(
          'Request timeout after 30000ms',
          new Error('AbortError'),
          'req_timeout_123'
        );

        mockClient.request = vi.fn().mockRejectedValue(networkError);

        // Act & Assert
        await expect(productsService.create(createRequest)).rejects.toThrow(
          IyzicoNetworkError
        );
        await expect(productsService.create(createRequest)).rejects.toThrow(
          'Request timeout after 30000ms'
        );

        try {
          await productsService.create(createRequest);
        } catch (error) {
          expect(error).toBeInstanceOf(IyzicoNetworkError);
          if (error instanceof IyzicoNetworkError) {
            expect(error.isTimeout).toBe(true);
            expect(error.requestId).toBe('req_timeout_123');
          }
        }
      });

      test('should handle maximum field length validation', async () => {
        // Arrange
        const createRequest: CreateProductRequest = {
          name: 'A'.repeat(256), // Very long name
          description: 'B'.repeat(1024), // Very long description
        };

        const apiError = new IyzicoApiError(
          'Product name exceeds maximum length',
          400,
          {
            status: 'failure',
            errorMessage: 'Product name exceeds maximum length',
            errorCode: 'FIELD_LENGTH_EXCEEDED',
          }
        );

        mockClient.request = vi.fn().mockRejectedValue(apiError);

        // Act & Assert
        await expect(productsService.create(createRequest)).rejects.toThrow(
          'Product name exceeds maximum length'
        );
      });

      test('should handle special characters in product data', async () => {
        // Arrange
        const createRequest: CreateProductRequest = {
          name: "Product with émojis 🚀 and special chars: <>&\"''",
          description:
            'Description with UTF-8: 你好, émojis 🎉, and symbols: ©®™',
          conversationId: 'special-chars-test',
          locale: 'tr',
        };

        const mockResponse: CreateProductResponse = {
          status: 'success',
          systemTime: 1640995200000,
          data: {
            referenceCode: 'PROD_SPECIAL_CHARS',
            createdDate: 1640995200000,
            name: "Product with émojis 🚀 and special chars: <>&\"''",
            description:
              'Description with UTF-8: 你好, émojis 🎉, and symbols: ©®™',
            status: 'ACTIVE',
            pricingPlans: [],
          },
        };

        mockClient.request = vi.fn().mockResolvedValue(mockResponse);

        // Act
        const result = await productsService.create(createRequest);

        // Assert
        expect(result.data?.name).toBe(
          "Product with émojis 🚀 and special chars: <>&\"''"
        );
        expect(result.data?.description).toBe(
          'Description with UTF-8: 你好, émojis 🎉, and symbols: ©®™'
        );
      });

      test('should handle minimum required fields only', async () => {
        // Arrange - Only required field (name)
        const createRequest: CreateProductRequest = {
          name: 'Minimal Product',
        };

        const mockResponse: CreateProductResponse = {
          status: 'success',
          systemTime: 1640995200000,
          data: {
            referenceCode: 'PROD_MINIMAL',
            createdDate: 1640995200000,
            name: 'Minimal Product',
            status: 'ACTIVE',
            pricingPlans: [],
          },
        };

        mockClient.request = vi.fn().mockResolvedValue(mockResponse);

        // Act
        const result = await productsService.create(createRequest);

        // Assert
        expect(result).toEqual(mockResponse);
        expect(mockClient.request).toHaveBeenCalledWith({
          path: '/v2/subscription/products',
          method: 'POST',
          body: {
            locale: 'tr',
            conversationId: expect.stringMatching(/^product-create-\d+$/),
            name: 'Minimal Product',
          },
        });
      });
    });

    describe('update edge cases', () => {
      test('should handle updating product with empty reference code', async () => {
        // Arrange
        const referenceCode = '';
        const updateRequest = {
          name: 'Updated Name',
        };

        const apiError = new IyzicoApiError(
          'Invalid product reference code',
          400,
          {
            status: 'failure',
            errorMessage: 'Invalid product reference code',
            errorCode: 'INVALID_REFERENCE_CODE',
          }
        );

        mockClient.request = vi.fn().mockRejectedValue(apiError);

        // Act & Assert
        await expect(
          productsService.update(referenceCode, updateRequest)
        ).rejects.toThrow('Invalid product reference code');
      });

      test('should handle server errors during update (5xx)', async () => {
        // Arrange
        const referenceCode = 'PROD_SERVER_ERROR';
        const updateRequest = {
          name: 'Updated Name',
        };

        const serverError = new IyzicoApiError('Internal server error', 500, {
          status: 'failure',
          errorMessage: 'Internal server error',
          errorCode: 'INTERNAL_SERVER_ERROR',
        });

        mockClient.request = vi.fn().mockRejectedValue(serverError);

        // Act & Assert
        await expect(
          productsService.update(referenceCode, updateRequest)
        ).rejects.toThrow(IyzicoApiError);

        try {
          await productsService.update(referenceCode, updateRequest);
        } catch (error) {
          if (error instanceof IyzicoApiError) {
            expect(error.statusCode).toBe(500);
            expect(error.isServerError()).toBe(true);
            expect(error.isRetryable()).toBe(true);
          }
        }
      });
    });

    describe('delete edge cases', () => {
      test('should handle deletion with malformed reference code', async () => {
        // Arrange
        const referenceCode = 'INVALID_FORMAT_@#$';
        const apiError = new IyzicoApiError(
          'Invalid reference code format',
          400,
          {
            status: 'failure',
            errorMessage: 'Invalid reference code format',
            errorCode: 'INVALID_FORMAT',
          }
        );

        mockClient.request = vi.fn().mockRejectedValue(apiError);

        // Act & Assert
        await expect(productsService.delete(referenceCode)).rejects.toThrow(
          'Invalid reference code format'
        );

        expect(mockClient.request).toHaveBeenCalledWith({
          path: '/v2/subscription/products/INVALID_FORMAT_@#$',
          method: 'DELETE',
        });
      });

      test('should handle rate limiting error (429)', async () => {
        // Arrange
        const referenceCode = 'PROD_RATE_LIMITED';
        const rateLimitError = new IyzicoApiError('Rate limit exceeded', 429, {
          status: 'failure',
          errorMessage: 'Rate limit exceeded',
          errorCode: 'RATE_LIMIT_EXCEEDED',
        });

        mockClient.request = vi.fn().mockRejectedValue(rateLimitError);

        // Act & Assert
        await expect(productsService.delete(referenceCode)).rejects.toThrow(
          IyzicoApiError
        );

        try {
          await productsService.delete(referenceCode);
        } catch (error) {
          if (error instanceof IyzicoApiError) {
            expect(error.statusCode).toBe(429);
            expect(error.isRetryable()).toBe(true);
          }
        }
      });
    });

    describe('retrieve edge cases', () => {
      test('should handle product with null/undefined fields', async () => {
        // Arrange
        const referenceCode = 'PROD_NULL_FIELDS';
        const mockProductData: ProductData = {
          referenceCode: 'PROD_NULL_FIELDS',
          createdDate: 1640995200000,
          name: 'Product with Null Fields',
          description: undefined, // Undefined description
          status: 'ACTIVE',
          pricingPlans: [],
        };

        const expectedResponse = {
          status: 'success',
          systemTime: 1640995200000,
          data: mockProductData,
        };

        mockClient.request = vi.fn().mockResolvedValue(expectedResponse);

        // Act
        const result = await productsService.retrieve(referenceCode);

        // Assert
        expect(result.data?.description).toBeUndefined();
        expect(result.data?.name).toBe('Product with Null Fields');
      });

      test('should handle retrieve with very long reference code', async () => {
        // Arrange
        const referenceCode = 'PROD_' + 'A'.repeat(100); // Very long reference code
        const apiError = new IyzicoApiError('Reference code too long', 400, {
          status: 'failure',
          errorMessage: 'Reference code too long',
          errorCode: 'REFERENCE_CODE_TOO_LONG',
        });

        mockClient.request = vi.fn().mockRejectedValue(apiError);

        // Act & Assert
        await expect(productsService.retrieve(referenceCode)).rejects.toThrow(
          'Reference code too long'
        );
      });
    });

    describe('list edge cases', () => {
      test('should handle very large product lists', async () => {
        // Arrange - Simulate a large list of products
        const largeProductList: ProductData[] = Array.from(
          { length: 1000 },
          (_, index) => ({
            referenceCode: `PROD_${index.toString().padStart(4, '0')}`,
            createdDate: 1640995200000 + index * 1000,
            name: `Product ${index + 1}`,
            description: `Description for product ${index + 1}`,
            status: index % 2 === 0 ? 'ACTIVE' : 'INACTIVE',
            pricingPlans: [],
          })
        );

        const expectedResponse = {
          status: 'success',
          systemTime: 1640995200000,
          data: largeProductList,
        };

        mockClient.request = vi.fn().mockResolvedValue(expectedResponse);

        // Act
        const result = await productsService.list();

        // Assert
        expect(result.data).toHaveLength(1000);
        expect(result.data?.[0].referenceCode).toBe('PROD_0000');
        expect(result.data?.[999].referenceCode).toBe('PROD_0999');
        expect(result.data?.filter((p) => p.status === 'ACTIVE')).toHaveLength(
          500
        );
        expect(
          result.data?.filter((p) => p.status === 'INACTIVE')
        ).toHaveLength(500);
      });

      test('should handle service unavailable error (503)', async () => {
        // Arrange
        const serviceError = new IyzicoApiError(
          'Service temporarily unavailable',
          503,
          {
            status: 'failure',
            errorMessage: 'Service temporarily unavailable',
            errorCode: 'SERVICE_UNAVAILABLE',
          }
        );

        mockClient.request = vi.fn().mockRejectedValue(serviceError);

        // Act & Assert
        await expect(productsService.list()).rejects.toThrow(IyzicoApiError);

        try {
          await productsService.list();
        } catch (error) {
          if (error instanceof IyzicoApiError) {
            expect(error.statusCode).toBe(503);
            expect(error.isServerError()).toBe(true);
            expect(error.isRetryable()).toBe(true);
          }
        }
      });
    });
  });

  // Performance and behavior tests
  describe('performance and behavior', () => {
    test('should handle concurrent requests correctly', async () => {
      // Arrange
      const createRequests: CreateProductRequest[] = [
        { name: 'Product 1', description: 'Description 1' },
        { name: 'Product 2', description: 'Description 2' },
        { name: 'Product 3', description: 'Description 3' },
      ];

      const mockResponses = createRequests.map((req, index) => ({
        status: 'success',
        systemTime: 1640995200000 + index,
        data: {
          referenceCode: `PROD_${index + 1}`,
          createdDate: 1640995200000 + index,
          name: req.name,
          description: req.description,
          status: 'ACTIVE',
          pricingPlans: [],
        },
      }));

      mockClient.request = vi
        .fn()
        .mockResolvedValueOnce(mockResponses[0])
        .mockResolvedValueOnce(mockResponses[1])
        .mockResolvedValueOnce(mockResponses[2]);

      // Act
      const promises = createRequests.map((req) => productsService.create(req));
      const results = await Promise.all(promises);

      // Assert
      expect(results).toHaveLength(3);
      expect(mockClient.request).toHaveBeenCalledTimes(3);
      results.forEach((result, index) => {
        expect(result.data?.name).toBe(`Product ${index + 1}`);
        expect(result.data?.referenceCode).toBe(`PROD_${index + 1}`);
      });
    });

    test('should preserve request order in method calls', async () => {
      // Arrange
      const referenceCode = 'PROD_ORDER_TEST';
      const updateRequest = {
        name: 'Updated Name',
        description: 'Updated Description',
      };

      const mockResponse: UpdateProductResponse = {
        status: 'success',
        systemTime: 1640995200000,
        data: {
          referenceCode,
          createdDate: 1640995200000,
          name: 'Updated Name',
          description: 'Updated Description',
          status: 'ACTIVE',
          pricingPlans: [],
        },
      };

      mockClient.request = vi.fn().mockResolvedValue(mockResponse);

      // Act
      await productsService.update(referenceCode, updateRequest);

      // Assert - Check that the parameters are passed in the correct order
      const [callArgs] = (mockClient.request as ReturnType<typeof vi.fn>).mock
        .calls[0] as [
        { path: string; method: string; body: Record<string, unknown> },
      ];
      expect(callArgs.body.locale).toBe('tr'); // Default should come first
      expect(callArgs.body.conversationId).toMatch(/^product-update-\d+$/);
      expect(callArgs.body.productReferenceCode).toBe(referenceCode);
      expect(callArgs.body.name).toBe('Updated Name'); // Params should override defaults
      expect(callArgs.body.description).toBe('Updated Description');
    });

    test('should handle method chaining correctly', async () => {
      // Arrange
      const createRequest: CreateProductRequest = {
        name: 'Chain Test Product',
        description: 'Testing method chaining',
      };

      const createResponse: CreateProductResponse = {
        status: 'success',
        systemTime: 1640995200000,
        data: {
          referenceCode: 'PROD_CHAIN_TEST',
          createdDate: 1640995200000,
          name: 'Chain Test Product',
          description: 'Testing method chaining',
          status: 'ACTIVE',
          pricingPlans: [],
        },
      };

      const retrieveResponse = {
        status: 'success',
        systemTime: 1640995200000,
        data: createResponse.data,
      };

      mockClient.request = vi
        .fn()
        .mockResolvedValueOnce(createResponse) // For create
        .mockResolvedValueOnce(retrieveResponse); // For retrieve

      // Act
      const createResult = await productsService.create(createRequest);
      const retrieveResult = await productsService.retrieve(
        createResult.data!.referenceCode
      );

      // Assert
      expect(createResult.data?.referenceCode).toBe('PROD_CHAIN_TEST');
      expect(retrieveResult.data?.referenceCode).toBe('PROD_CHAIN_TEST');
      expect(retrieveResult.data?.name).toBe('Chain Test Product');
      expect(mockClient.request).toHaveBeenCalledTimes(2);
    });
  });
});
