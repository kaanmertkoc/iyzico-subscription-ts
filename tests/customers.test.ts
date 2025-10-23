import { beforeEach, describe, expect, test, vi } from 'vitest';
import { type IyzicoClient } from '../src/client';
import { IyzicoApiError, IyzicoNetworkError } from '../src/error';
import { CustomersService } from '../src/services/customers';
import type {
  UpdateCustomerRequest,
  UpdateCustomerResponse,
  BaseResponse,
  BaseCustomer,
} from '../src/types';

// Create a mock client
const mockClient = {
  request: vi.fn(),
} as unknown as IyzicoClient;

describe('CustomersService', () => {
  let customersService: CustomersService;

  beforeEach(() => {
    customersService = new CustomersService(mockClient);
    vi.clearAllMocks();
  });

  describe('update', () => {
    test('should make successful customer update request', async () => {
      // Arrange
      const referenceCode = 'CUST_123456';
      const updateRequest: UpdateCustomerRequest = {
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
      };

      const mockCustomerData: BaseCustomer = {
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
      };

      const expectedResponse: UpdateCustomerResponse = {
        status: 'success',
        systemTime: 1640995200000,
        data: mockCustomerData,
      };

      mockClient.request = vi.fn().mockResolvedValue(expectedResponse);

      // Act
      const result = await customersService.update(
        referenceCode,
        updateRequest
      );

      // Assert
      expect(result).toEqual(expectedResponse);
      expect(mockClient.request).toHaveBeenCalledOnce();
      expect(mockClient.request).toHaveBeenCalledWith({
        path: `/v2/subscription/customers/${referenceCode}`,
        method: 'POST',
        body: {
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
      });
    });


    test('should handle partial customer updates', async () => {
      // Arrange
      const referenceCode = 'CUST_PARTIAL';
      const updateRequest: UpdateCustomerRequest = {
        name: 'Updated',
        surname: 'Name',
        email: 'updated@example.com',
      };

      const mockResponse: UpdateCustomerResponse = {
        status: 'success',
        systemTime: 1640995200000,
        data: {
          name: 'Updated',
          surname: 'Name',
          email: 'updated@example.com',
        },
      };

      mockClient.request = vi.fn().mockResolvedValue(mockResponse);

      // Act
      const result = await customersService.update(
        referenceCode,
        updateRequest
      );

      // Assert
      expect(result.data?.name).toBe('Updated');
      expect(result.data?.surname).toBe('Name');
      expect(result.data?.email).toBe('updated@example.com');
      expect(mockClient.request).toHaveBeenCalledOnce();
    });

    test('should handle address updates with zipCode', async () => {
      // Arrange
      const referenceCode = 'CUST_ZIP';
      const updateRequest: UpdateCustomerRequest = {
        name: 'Address',
        surname: 'User',
        email: 'address@example.com',
        billingAddress: {
          contactName: 'Billing Contact',
          country: 'Turkey',
          city: 'Istanbul',
          zipCode: '34000',
          address: 'Billing Address with Zip',
        },
        shippingAddress: {
          contactName: 'Shipping Contact',
          country: 'Turkey',
          city: 'Ankara',
          zipCode: '06000',
          address: 'Shipping Address with Zip',
        },
      };

      const mockResponse: UpdateCustomerResponse = {
        status: 'success',
        systemTime: 1640995200000,
        data: updateRequest,
      };

      mockClient.request = vi.fn().mockResolvedValue(mockResponse);

      // Act
      await customersService.update(referenceCode, updateRequest);

      // Assert
      const [callArgs] = (mockClient.request as ReturnType<typeof vi.fn>).mock
        .calls[0] as [
        { path: string; method: string; body: Record<string, unknown> }
      ];
      expect(
        (callArgs.body.billingAddress as Record<string, unknown>)?.zipCode
      ).toBe('34000');
      expect(
        (callArgs.body.shippingAddress as Record<string, unknown>)?.zipCode
      ).toBe('06000');
    });

    test('should handle special characters in customer data', async () => {
      // Arrange
      const referenceCode = 'CUST_SPECIAL';
      const updateRequest: UpdateCustomerRequest = {
        name: 'Ömer',
        surname: 'Şahin',
        email: 'omer.sahin@örnek.com',
        billingAddress: {
          contactName: 'Ömer Şahin',
          country: 'Türkiye',
          city: 'İstanbul',
          address: 'Çiçek Sokak No:5',
        },
      };

      const mockResponse: UpdateCustomerResponse = {
        status: 'success',
        systemTime: 1640995200000,
        data: updateRequest,
      };

      mockClient.request = vi.fn().mockResolvedValue(mockResponse);

      // Act
      const result = await customersService.update(
        referenceCode,
        updateRequest
      );

      // Assert
      expect(result.data?.name).toBe('Ömer');
      expect(result.data?.surname).toBe('Şahin');
      expect(result.data?.billingAddress?.city).toBe('İstanbul');
    });

    test('should handle API errors gracefully', async () => {
      // Arrange
      const referenceCode = 'CUST_INVALID';
      const updateRequest: UpdateCustomerRequest = {
        name: '',
        surname: '',
        email: 'invalid-email',
      };

      const apiError = new IyzicoApiError('Customer validation failed', 400, {
        status: 'failure',
        errorMessage: 'Customer validation failed',
        errorCode: 'VALIDATION_ERROR',
      });
      mockClient.request = vi.fn().mockRejectedValue(apiError);

      // Act & Assert
      await expect(
        customersService.update(referenceCode, updateRequest)
      ).rejects.toThrow(IyzicoApiError);

      try {
        await customersService.update(referenceCode, updateRequest);
      } catch (error) {
        expect(error).toBeInstanceOf(IyzicoApiError);
        if (error instanceof IyzicoApiError) {
          expect(error.statusCode).toBe(400);
          expect(error.isClientError()).toBe(true);
        }
      }
    });

    test('should handle customer not found error', async () => {
      // Arrange
      const referenceCode = 'CUST_NOT_EXISTS';
      const updateRequest: UpdateCustomerRequest = {
        name: 'Valid',
        surname: 'Name',
        email: 'valid@example.com',
      };

      const notFoundError = new IyzicoApiError('Customer not found', 404, {
        status: 'failure',
        errorMessage: 'Customer not found',
        errorCode: 'CUSTOMER_NOT_FOUND',
      });
      mockClient.request = vi.fn().mockRejectedValue(notFoundError);

      // Act & Assert
      await expect(
        customersService.update(referenceCode, updateRequest)
      ).rejects.toThrow(IyzicoApiError);

      try {
        await customersService.update(referenceCode, updateRequest);
      } catch (error) {
        if (error instanceof IyzicoApiError) {
          expect(error.statusCode).toBe(404);
          expect(error.isClientError()).toBe(true);
        }
      }
    });

    test('should handle network errors', async () => {
      // Arrange
      const referenceCode = 'CUST_NETWORK';
      const updateRequest: UpdateCustomerRequest = {
        name: 'Network',
        surname: 'Test',
        email: 'network@example.com',
      };

      const networkError = new IyzicoNetworkError('Network connection failed');
      mockClient.request = vi.fn().mockRejectedValue(networkError);

      // Act & Assert
      await expect(
        customersService.update(referenceCode, updateRequest)
      ).rejects.toThrow(IyzicoNetworkError);

      expect(mockClient.request).toHaveBeenCalledOnce();
    });

    test('should handle server errors (5xx)', async () => {
      // Arrange
      const referenceCode = 'CUST_SERVER_ERROR';
      const updateRequest: UpdateCustomerRequest = {
        name: 'Server',
        surname: 'Error',
        email: 'server@example.com',
      };

      const serverError = new IyzicoApiError('Internal server error', 500, {
        status: 'failure',
        errorMessage: 'Internal server error',
        errorCode: 'INTERNAL_SERVER_ERROR',
      });
      mockClient.request = vi.fn().mockRejectedValue(serverError);

      // Act & Assert
      await expect(
        customersService.update(referenceCode, updateRequest)
      ).rejects.toThrow(IyzicoApiError);

      try {
        await customersService.update(referenceCode, updateRequest);
      } catch (error) {
        if (error instanceof IyzicoApiError) {
          expect(error.statusCode).toBe(500);
          expect(error.isServerError()).toBe(true);
          expect(error.isRetryable()).toBe(true);
        }
      }
    });
  });

  describe('retrieve', () => {
    test('should make successful customer retrieval request', async () => {
      // Arrange
      const referenceCode = 'CUST_RETRIEVE';
      const mockCustomerData: BaseCustomer = {
        name: 'Retrieved',
        surname: 'Customer',
        email: 'retrieved@example.com',
        gsmNumber: '+905551234567',
        identityNumber: '22222222222',
        billingAddress: {
          contactName: 'Retrieved Customer',
          country: 'Turkey',
          city: 'Istanbul',
          address: 'Retrieved Address',
        },
        shippingAddress: {
          contactName: 'Retrieved Customer',
          country: 'Turkey',
          city: 'Istanbul',
          address: 'Retrieved Address',
        },
      };

      const expectedResponse: BaseResponse<BaseCustomer> = {
        status: 'success',
        systemTime: 1640995200000,
        data: mockCustomerData,
      };

      mockClient.request = vi.fn().mockResolvedValue(expectedResponse);

      // Act
      const result = await customersService.retrieve(referenceCode);

      // Assert
      expect(result).toEqual(expectedResponse);
      expect(result.data?.name).toBe('Retrieved');
      expect(result.data?.surname).toBe('Customer');
      expect(result.data?.email).toBe('retrieved@example.com');

      expect(mockClient.request).toHaveBeenCalledOnce();
      expect(mockClient.request).toHaveBeenCalledWith({
        path: `/v2/subscription/customers/${referenceCode}`,
        method: 'GET',
      });
    });

    test('should retrieve customer without optional fields', async () => {
      // Arrange
      const referenceCode = 'CUST_MINIMAL';
      const mockCustomerData: BaseCustomer = {
        name: 'Minimal',
        surname: 'Customer',
        email: 'minimal@example.com',
      };

      const expectedResponse: BaseResponse<BaseCustomer> = {
        status: 'success',
        systemTime: 1640995200000,
        data: mockCustomerData,
      };

      mockClient.request = vi.fn().mockResolvedValue(expectedResponse);

      // Act
      const result = await customersService.retrieve(referenceCode);

      // Assert
      expect(result.data?.name).toBe('Minimal');
      expect(result.data?.gsmNumber).toBeUndefined();
      expect(result.data?.billingAddress).toBeUndefined();
      expect(result.data?.shippingAddress).toBeUndefined();
    });

    test('should handle customer not found during retrieval', async () => {
      // Arrange
      const referenceCode = 'CUST_NOT_EXISTS';
      const notFoundError = new IyzicoApiError('Customer not found', 404, {
        status: 'failure',
        errorMessage: 'Customer not found',
        errorCode: 'CUSTOMER_NOT_FOUND',
      });
      mockClient.request = vi.fn().mockRejectedValue(notFoundError);

      // Act & Assert
      await expect(customersService.retrieve(referenceCode)).rejects.toThrow(
        IyzicoApiError
      );

      expect(mockClient.request).toHaveBeenCalledWith({
        path: `/v2/subscription/customers/${referenceCode}`,
        method: 'GET',
      });
    });

    test('should handle unauthorized access error', async () => {
      // Arrange
      const referenceCode = 'CUST_UNAUTHORIZED';
      const unauthorizedError = new IyzicoApiError('Unauthorized access', 401, {
        status: 'failure',
        errorMessage: 'Unauthorized access',
        errorCode: 'UNAUTHORIZED',
      });
      mockClient.request = vi.fn().mockRejectedValue(unauthorizedError);

      // Act & Assert
      await expect(customersService.retrieve(referenceCode)).rejects.toThrow(
        IyzicoApiError
      );

      try {
        await customersService.retrieve(referenceCode);
      } catch (error) {
        if (error instanceof IyzicoApiError) {
          expect(error.statusCode).toBe(401);
          expect(error.isClientError()).toBe(true);
        }
      }
    });

    test('should handle network errors during retrieval', async () => {
      // Arrange
      const referenceCode = 'CUST_NETWORK';
      const networkError = new IyzicoNetworkError('Request timeout');
      mockClient.request = vi.fn().mockRejectedValue(networkError);

      // Act & Assert
      await expect(customersService.retrieve(referenceCode)).rejects.toThrow(
        IyzicoNetworkError
      );

      expect(mockClient.request).toHaveBeenCalledOnce();
    });

    test('should handle malformed reference code', async () => {
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
      await expect(customersService.retrieve(referenceCode)).rejects.toThrow(
        'Invalid reference code format'
      );

      expect(mockClient.request).toHaveBeenCalledWith({
        path: `/v2/subscription/customers/${referenceCode}`,
        method: 'GET',
      });
    });
  });

  describe('list', () => {
    test('should make successful customers list request', async () => {
      // Arrange
      const mockCustomersData: BaseCustomer[] = [
        {
          name: 'Customer',
          surname: 'One',
          email: 'customer1@example.com',
          gsmNumber: '+905551111111',
        },
        {
          name: 'Customer',
          surname: 'Two',
          email: 'customer2@example.com',
          gsmNumber: '+905552222222',
        },
        {
          name: 'Customer',
          surname: 'Three',
          email: 'customer3@example.com',
          gsmNumber: '+905553333333',
        },
      ];

      const expectedResponse = {
        status: 'success',
        systemTime: 1640995200000,
        data: {
          items: mockCustomersData,
          totalCount: 3,
          currentPage: 1,
          pageCount: 1,
        },
      };

      mockClient.request = vi.fn().mockResolvedValue(expectedResponse);

      // Act
      const result = await customersService.list();

      // Assert
      expect(result).toEqual(expectedResponse);
      expect(result.data?.items).toHaveLength(3);
      expect(result.data?.items?.[0].email).toBe('customer1@example.com');
      expect(result.data?.items?.[1].email).toBe('customer2@example.com');
      expect(result.data?.items?.[2].email).toBe('customer3@example.com');

      expect(mockClient.request).toHaveBeenCalledOnce();
      expect(mockClient.request).toHaveBeenCalledWith({
        path: '/v2/subscription/customers?page=1&count=10',
        method: 'GET',
      });
    });

    test('should support custom pagination parameters', async () => {
      // Arrange
      const mockCustomersData: BaseCustomer[] = [
        {
          name: 'Page',
          surname: 'Two',
          email: 'page2@example.com',
          gsmNumber: '+905551111111',
        },
      ];

      const expectedResponse = {
        status: 'success',
        systemTime: 1640995200000,
        data: {
          items: mockCustomersData,
          totalCount: 50,
          currentPage: 2,
          pageCount: 5,
        },
      };

      mockClient.request = vi.fn().mockResolvedValue(expectedResponse);

      // Act
      const result = await customersService.list(2, 10);

      // Assert
      expect(result).toEqual(expectedResponse);
      expect(result.data?.currentPage).toBe(2);
      expect(mockClient.request).toHaveBeenCalledWith({
        path: '/v2/subscription/customers?page=2&count=10',
        method: 'GET',
      });
    });

    test('should handle empty customers list', async () => {
      // Arrange
      const expectedResponse = {
        status: 'success',
        systemTime: 1640995200000,
        data: {
          items: [],
          totalCount: 0,
          currentPage: 1,
          pageCount: 0,
        },
      };

      mockClient.request = vi.fn().mockResolvedValue(expectedResponse);

      // Act
      const result = await customersService.list();

      // Assert
      expect(result.data?.items).toEqual([]);
      expect(result.data?.items).toHaveLength(0);
    });

    test('should handle customers with full details', async () => {
      // Arrange
      const mockCustomersData: BaseCustomer[] = [
        {
          name: 'Full',
          surname: 'Details',
          email: 'full@example.com',
          gsmNumber: '+905554444444',
          identityNumber: '33333333333',
          billingAddress: {
            contactName: 'Full Details',
            country: 'Turkey',
            city: 'Istanbul',
            zipCode: '34000',
            address: 'Full Address',
          },
          shippingAddress: {
            contactName: 'Full Details',
            country: 'Turkey',
            city: 'Ankara',
            zipCode: '06000',
            address: 'Shipping Address',
          },
        },
      ];

      const expectedResponse = {
        status: 'success',
        systemTime: 1640995200000,
        data: {
          items: mockCustomersData,
          totalCount: 1,
          currentPage: 1,
          pageCount: 1,
        },
      };

      mockClient.request = vi.fn().mockResolvedValue(expectedResponse);

      // Act
      const result = await customersService.list();

      // Assert
      expect(result.data?.items).toHaveLength(1);
      expect(result.data?.items?.[0].billingAddress?.zipCode).toBe('34000');
      expect(result.data?.items?.[0].shippingAddress?.zipCode).toBe('06000');
    });

    test('should handle API errors during list operation', async () => {
      // Arrange
      const apiError = new IyzicoApiError('Internal server error', 500, {
        status: 'failure',
        errorMessage: 'Internal server error',
        errorCode: 'INTERNAL_SERVER_ERROR',
      });
      mockClient.request = vi.fn().mockRejectedValue(apiError);

      // Act & Assert
      await expect(customersService.list()).rejects.toThrow(IyzicoApiError);

      expect(mockClient.request).toHaveBeenCalledOnce();
    });

    test('should handle unauthorized access during list operation', async () => {
      // Arrange
      const unauthorizedError = new IyzicoApiError(
        'Invalid API credentials',
        401,
        {
          status: 'failure',
          errorMessage: 'Invalid API credentials',
          errorCode: 'INVALID_CREDENTIALS',
        }
      );
      mockClient.request = vi.fn().mockRejectedValue(unauthorizedError);

      // Act & Assert
      await expect(customersService.list()).rejects.toThrow(IyzicoApiError);
    });

    test('should handle network timeout during list operation', async () => {
      // Arrange
      const timeoutError = new IyzicoNetworkError('Request timeout');
      mockClient.request = vi.fn().mockRejectedValue(timeoutError);

      // Act & Assert
      await expect(customersService.list()).rejects.toThrow(IyzicoNetworkError);
    });

    test('should handle large customer lists', async () => {
      // Arrange
      const largeCustomerList: BaseCustomer[] = Array.from(
        { length: 100 },
        (_, index) => ({
          name: `Customer${index}`,
          surname: `User${index}`,
          email: `customer${index}@example.com`,
          gsmNumber: `+9055500${index.toString().padStart(5, '0')}`,
        })
      );

      const expectedResponse = {
        status: 'success',
        systemTime: 1640995200000,
        data: {
          items: largeCustomerList,
          totalCount: 100,
          currentPage: 1,
          pageCount: 10,
        },
      };

      mockClient.request = vi.fn().mockResolvedValue(expectedResponse);

      // Act
      const result = await customersService.list();

      // Assert
      expect(result.data?.items).toHaveLength(100);
      expect(result.data?.items?.[0].email).toBe('customer0@example.com');
      expect(result.data?.items?.[99].email).toBe('customer99@example.com');
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
      await expect(customersService.list()).rejects.toThrow(IyzicoApiError);

      try {
        await customersService.list();
      } catch (error) {
        if (error instanceof IyzicoApiError) {
          expect(error.statusCode).toBe(503);
          expect(error.isServerError()).toBe(true);
          expect(error.isRetryable()).toBe(true);
        }
      }
    });
  });

  // Edge cases and advanced error handling
  describe('edge cases and advanced error handling', () => {
    describe('update edge cases', () => {
      test('should handle empty reference code', async () => {
        // Arrange
        const referenceCode = '';
        const updateRequest: UpdateCustomerRequest = {
          name: 'Test',
          surname: 'User',
          email: 'test@example.com',
        };

        const apiError = new IyzicoApiError('Reference code is required', 400, {
          status: 'failure',
          errorMessage: 'Reference code is required',
          errorCode: 'INVALID_REFERENCE_CODE',
        });

        mockClient.request = vi.fn().mockRejectedValue(apiError);

        // Act & Assert
        await expect(
          customersService.update(referenceCode, updateRequest)
        ).rejects.toThrow('Reference code is required');
      });

      test('should handle maximum field length validation', async () => {
        // Arrange
        const referenceCode = 'CUST_MAX_LENGTH';
        const updateRequest: UpdateCustomerRequest = {
          name: 'A'.repeat(256),
          surname: 'B'.repeat(256),
          email: 'test@example.com',
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
          customersService.update(referenceCode, updateRequest)
        ).rejects.toThrow('Field length exceeds maximum');
      });

      test('should handle invalid email format', async () => {
        // Arrange
        const referenceCode = 'CUST_INVALID_EMAIL';
        const updateRequest: UpdateCustomerRequest = {
          name: 'Test',
          surname: 'User',
          email: 'invalid-email-format',
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
          customersService.update(referenceCode, updateRequest)
        ).rejects.toThrow('Invalid email format');
      });

      test('should handle rate limiting error (429)', async () => {
        // Arrange
        const referenceCode = 'CUST_RATE_LIMITED';
        const updateRequest: UpdateCustomerRequest = {
          name: 'Test',
          surname: 'User',
          email: 'test@example.com',
        };

        const rateLimitError = new IyzicoApiError('Rate limit exceeded', 429, {
          status: 'failure',
          errorMessage: 'Rate limit exceeded',
          errorCode: 'RATE_LIMIT_EXCEEDED',
        });

        mockClient.request = vi.fn().mockRejectedValue(rateLimitError);

        // Act & Assert
        await expect(
          customersService.update(referenceCode, updateRequest)
        ).rejects.toThrow(IyzicoApiError);

        try {
          await customersService.update(referenceCode, updateRequest);
        } catch (error) {
          if (error instanceof IyzicoApiError) {
            expect(error.statusCode).toBe(429);
            expect(error.isRetryable()).toBe(true);
          }
        }
      });
    });

    describe('retrieve edge cases', () => {
      test('should handle very long reference code', async () => {
        // Arrange
        const referenceCode = 'CUST_' + 'A'.repeat(100);
        const apiError = new IyzicoApiError('Reference code too long', 400, {
          status: 'failure',
          errorMessage: 'Reference code too long',
          errorCode: 'REFERENCE_CODE_TOO_LONG',
        });

        mockClient.request = vi.fn().mockRejectedValue(apiError);

        // Act & Assert
        await expect(customersService.retrieve(referenceCode)).rejects.toThrow(
          'Reference code too long'
        );
      });
    });
  });

  // Performance and behavior tests
  describe('performance and behavior', () => {
    test('should handle concurrent update requests correctly', async () => {
      // Arrange
      const referenceCodes = ['CUST_1', 'CUST_2', 'CUST_3'];
      const updateRequests = referenceCodes.map((code, index) => ({
        name: `Customer${index + 1}`,
        surname: `Test${index + 1}`,
        email: `customer${index + 1}@example.com`,
      }));

      const mockResponses = referenceCodes.map((code, index) => ({
        status: 'success',
        systemTime: 1640995200000 + index,
        data: updateRequests[index],
      }));

      mockClient.request = vi
        .fn()
        .mockResolvedValueOnce(mockResponses[0])
        .mockResolvedValueOnce(mockResponses[1])
        .mockResolvedValueOnce(mockResponses[2]);

      // Act
      const promises = referenceCodes.map((code, index) =>
        customersService.update(code, updateRequests[index])
      );
      const results = await Promise.all(promises);

      // Assert
      expect(results).toHaveLength(3);
      expect(mockClient.request).toHaveBeenCalledTimes(3);
      results.forEach((result, index) => {
        expect(result.data?.name).toBe(`Customer${index + 1}`);
      });
    });

    test('should handle method chaining correctly', async () => {
      // Arrange
      const referenceCode = 'CUST_CHAIN';
      const updateRequest: UpdateCustomerRequest = {
        name: 'Chain',
        surname: 'Test',
        email: 'chain@example.com',
      };

      const updateResponse: UpdateCustomerResponse = {
        status: 'success',
        systemTime: 1640995200000,
        data: {
          name: 'Chain',
          surname: 'Test',
          email: 'chain@example.com',
        },
      };

      const retrieveResponse: BaseResponse<BaseCustomer> = {
        status: 'success',
        systemTime: 1640995200000,
        data: {
          name: 'Chain',
          surname: 'Test',
          email: 'chain@example.com',
        },
      };

      mockClient.request = vi
        .fn()
        .mockResolvedValueOnce(updateResponse) // For update
        .mockResolvedValueOnce(retrieveResponse); // For retrieve

      // Act
      const updateResult = await customersService.update(
        referenceCode,
        updateRequest
      );
      const retrieveResult = await customersService.retrieve(referenceCode);

      // Assert
      expect(updateResult.data?.email).toBe('chain@example.com');
      expect(retrieveResult.data?.email).toBe('chain@example.com');
      expect(mockClient.request).toHaveBeenCalledTimes(2);
    });

    test('should handle sequential operations', async () => {
      // Arrange
      const referenceCodes = ['CUST_SEQ_1', 'CUST_SEQ_2', 'CUST_SEQ_3'];
      const mockResponses = referenceCodes.map((code) => ({
        status: 'success',
        systemTime: 1640995200000,
        data: {
          name: 'Sequential',
          surname: 'Customer',
          email: `${code.toLowerCase()}@example.com`,
        },
      }));

      mockClient.request = vi
        .fn()
        .mockResolvedValueOnce(mockResponses[0])
        .mockResolvedValueOnce(mockResponses[1])
        .mockResolvedValueOnce(mockResponses[2]);

      // Act
      const results: BaseResponse<BaseCustomer>[] = [];
      for (const code of referenceCodes) {
        const result = await customersService.retrieve(code);
        results.push(result);
      }

      // Assert
      expect(results).toHaveLength(3);
      expect(mockClient.request).toHaveBeenCalledTimes(3);
      results.forEach((result, index) => {
        expect(result.data?.email).toBe(
          `${referenceCodes[index].toLowerCase()}@example.com`
        );
      });
    });
  });
});
