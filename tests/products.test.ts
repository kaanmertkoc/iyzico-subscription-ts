import { beforeEach, describe, expect, test, vi } from 'vitest';
import type { IyzicoClient } from '../src/client';
import { ProductsService } from '../src/services/products';
import type {
  CreateProductRequest,
  CreateProductResponse,
  ProductData,
} from '../src/types';
import { CurrencyCode, PaymentInterval, Status } from '../src/types/core';
import { PlanPaymentType } from '../src/types/plans';

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
      const callArgs = (mockClient.request as any).mock.calls[0][0];
      const conversationId = callArgs.body.conversationId;

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
      const callArgs = (mockClient.request as any).mock.calls[0][0];
      const conversationId = callArgs.body.conversationId;

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
});
