import { vi, test, expect, describe, beforeEach } from 'vitest';
import { ProductsService } from '../src/services/products';
import type { IyzicoClient } from '../src/client';
import type { 
  CreateProductRequest, 
  CreateProductResponse, 
  ProductData 
} from '../src/types';

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
        description: 'Monthly premium subscription plan'
      };

      const mockProductData: ProductData = {
        referenceCode: 'PROD_123456',
        createdDate: 1640995200000,
        name: 'Premium Subscription',
        description: 'Monthly premium subscription plan',
        status: 'ACTIVE',
        pricingPlans: []
      };

      const expectedResponse: CreateProductResponse = {
        status: 'success',
        systemTime: 1640995200000,
        data: mockProductData
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
          description: 'Monthly premium subscription plan'
        }
      });
    });

    test('should merge default parameters with provided parameters', async () => {
      // Arrange
      const createRequest: CreateProductRequest = {
        name: 'Basic Plan',
        description: 'Basic subscription plan',
        conversationId: 'custom-conversation-id' // This should override the default
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
          pricingPlans: []
        }
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
          description: 'Basic subscription plan'
        }
      });
    });

    test('should preserve custom locale when provided', async () => {
      // Arrange
      const createRequest: CreateProductRequest = {
        name: 'Enterprise Plan',
        description: 'Enterprise subscription plan',
        locale: 'en' // Custom locale
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
          pricingPlans: []
        }
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
          description: 'Enterprise subscription plan'
        }
      });
    });

    test('should generate dynamic conversationId with current timestamp', async () => {
      // Arrange
      const createRequest: CreateProductRequest = {
        name: 'Test Product',
        description: 'Test description'
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
          pricingPlans: []
        }
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
        description: 'Invalid product'
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
          description: 'Invalid product'
        }
      });
    });

    test('should handle network errors', async () => {
      // Arrange
      const createRequest: CreateProductRequest = {
        name: 'Network Test Product',
        description: 'Testing network failure'
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
        conversationId: 'business-flow-2024'
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
          pricingPlans: []
        }
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
          description: 'Comprehensive business solution with advanced features'
        }
      });
    });
  });

  // TODO: Implement the following test suites following the same patterns:
  // describe('update', () => { ... });
  // describe('delete', () => { ... }); 
  // describe('retrieve', () => { ... });
  // describe('list', () => { ... });
});
