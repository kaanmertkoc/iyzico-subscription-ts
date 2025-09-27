import { beforeEach, describe, expect, test, vi } from 'vitest';
import {
  IyzicoApiError,
  IyzicoNetworkError,
  type IyzicoClient,
} from '../src/client';
import { PlansService } from '../src/services/plans';
import { CurrencyCode, PaymentInterval, Status } from '../src/types/core';
import type {
  BasePaymentPlanData,
  DeletePaymentPlanResponse,
  GetPaymentPlanResponse,
  ListPaymentPlansResponse,
  PaymentPlanData,
  PaymentPlanResponse,
  UpdatePaymentPlanResponse
} from '../src/types/plans';
import { PlanPaymentType } from '../src/types/plans';

// Create a mock client
const mockClient = {
  request: vi.fn(),
} as unknown as IyzicoClient;

describe('PlansService', () => {
  let plansService: PlansService;

  beforeEach(() => {
    plansService = new PlansService(mockClient);
    vi.clearAllMocks();
  });

  describe('create', () => {
    test('should make successful payment plan creation request', async () => {
      // Arrange
      const productReferenceCode = 'PROD_123456';
      const createParams = {
        name: 'Monthly Premium Plan',
        price: 29.99,
        paymentInterval: PaymentInterval.MONTHLY,
        paymentIntervalCount: 1,
        planPaymentType: PlanPaymentType.RECURRING,
        currencyCode: CurrencyCode.TRY,
        trialPeriodDays: 7,
        recurrenceCount: 12,
      };

      const mockPaymentPlanData: PaymentPlanData = {
        referenceCode: 'PLAN_789012',
        createdDate: 1640995200000,
        name: 'Monthly Premium Plan',
        price: 29.99,
        paymentInterval: PaymentInterval.MONTHLY,
        paymentIntervalCount: 1,
        trialPeriodDays: 7,
        currencyCode: 'TRY',
        productReferenceCode: 'PROD_123456',
        planPaymentType: 'RECURRING',
        status: 'ACTIVE',
        recurrenceCount: 12,
      };

      const expectedResponse: PaymentPlanResponse = {
        status: 'success',
        systemTime: 1640995200000,
        data: mockPaymentPlanData,
      };

      mockClient.request = vi.fn().mockResolvedValue(expectedResponse);

      // Act
      const result = await plansService.create(productReferenceCode, createParams);

      // Assert
      expect(result).toEqual(expectedResponse);
      expect(mockClient.request).toHaveBeenCalledOnce();
      expect(mockClient.request).toHaveBeenCalledWith({
        path: `/v2/subscription/products/${productReferenceCode}/pricing-plans`,
        method: 'POST',
        body: {
          conversationId: expect.stringMatching(/^plan-create-\d+$/),
          productReferenceCode: 'PROD_123456',
          name: 'Monthly Premium Plan',
          price: 29.99,
          paymentInterval: PaymentInterval.MONTHLY,
          paymentIntervalCount: 1,
          planPaymentType: PlanPaymentType.RECURRING,
          currencyCode: CurrencyCode.TRY,
          trialPeriodDays: 7,
          recurrenceCount: 12,
        },
      });
    });

    test('should merge default parameters with provided parameters', async () => {
      // Arrange
      const productReferenceCode = 'PROD_789';
      const createParams = {
        name: 'Yearly Basic Plan',
        price: 199.99,
        paymentInterval: PaymentInterval.YEARLY,
        paymentIntervalCount: 1,
        planPaymentType: PlanPaymentType.RECURRING,
        currencyCode: CurrencyCode.USD,
        conversationId: 'custom-plan-create-id', // This should override the default
        locale: 'en', // Custom locale
      };

      const mockResponse: PaymentPlanResponse = {
        status: 'success',
        systemTime: 1640995200000,
        data: {
          referenceCode: 'PLAN_YEARLY_BASIC',
          createdDate: 1640995200000,
          name: 'Yearly Basic Plan',
          price: 199.99,
          paymentInterval: PaymentInterval.DAILY,
          paymentIntervalCount: 1,
          trialPeriodDays: 0,
          currencyCode: 'USD',
          productReferenceCode: 'PROD_789',
          planPaymentType: 'RECURRING',
          status: 'ACTIVE',
          recurrenceCount: 1,
        },
      };

      mockClient.request = vi.fn().mockResolvedValue(mockResponse);

      // Act
      await plansService.create(productReferenceCode, createParams);

      // Assert
      expect(mockClient.request).toHaveBeenCalledWith({
        path: `/v2/subscription/products/${productReferenceCode}/pricing-plans`,
        method: 'POST',
        body: {
          conversationId: 'custom-plan-create-id', // Custom value should override default
          productReferenceCode: 'PROD_789',
          name: 'Yearly Basic Plan',
          price: 199.99,
          paymentInterval: PaymentInterval.YEARLY,
          paymentIntervalCount: 1,
          planPaymentType: PlanPaymentType.RECURRING,
          currencyCode: CurrencyCode.USD,
          locale: 'en', // Custom locale should be preserved
        },
      });
    });

    test('should generate dynamic conversationId with current timestamp', async () => {
      // Arrange
      const productReferenceCode = 'PROD_TEST';
      const createParams = {
        name: 'Test Plan',
        price: 9.99,
        paymentInterval: PaymentInterval.MONTHLY,
        paymentIntervalCount: 1,
        planPaymentType: PlanPaymentType.RECURRING,
        currencyCode: CurrencyCode.TRY,
      };

      const mockResponse: PaymentPlanResponse = {
        status: 'success',
        systemTime: 1640995200000,
        data: {
          referenceCode: 'PLAN_TEST',
          createdDate: 1640995200000,
          name: 'Test Plan',
          price: 9.99,
          paymentInterval: PaymentInterval.MONTHLY,
          paymentIntervalCount: 1,
          trialPeriodDays: 0,
          currencyCode: 'TRY',
          productReferenceCode: 'PROD_TEST',
          planPaymentType: 'RECURRING',
          status: 'ACTIVE',
          recurrenceCount: 0,
        },
      };

      mockClient.request = vi.fn().mockResolvedValue(mockResponse);
      const beforeTime = Date.now();

      // Act
      await plansService.create(productReferenceCode, createParams);
      const afterTime = Date.now();

      // Assert
      const [callArgs] = (mockClient.request as ReturnType<typeof vi.fn>).mock
        .calls[0] as [
        { path: string; method: string; body: Record<string, unknown> },
      ];
      const conversationId = callArgs.body.conversationId as string;

      expect(conversationId).toMatch(/^plan-create-\d+$/);

      // Extract timestamp from conversationId and verify it's recent
      const timestamp = parseInt(conversationId.replace('plan-create-', ''));
      expect(timestamp).toBeGreaterThanOrEqual(beforeTime);
      expect(timestamp).toBeLessThanOrEqual(afterTime);
    });

    test('should handle API errors gracefully', async () => {
      // Arrange
      const productReferenceCode = 'PROD_INVALID';
      const createParams = {
        name: '', // Invalid empty name
        price: -10, // Invalid negative price
        paymentInterval: PaymentInterval.MONTH,
        paymentIntervalCount: 1,
        planPaymentType: PlanPaymentType.RECURRING,
        currencyCode: CurrencyCode.TRY,
      };

      const apiError = new IyzicoApiError('Plan name cannot be empty and price must be positive', 400, {
        status: 'failure',
        errorMessage: 'Plan name cannot be empty and price must be positive',
        errorCode: 'VALIDATION_ERROR',
      });
      mockClient.request = vi.fn().mockRejectedValue(apiError);

      // Act
      let caughtError: unknown;
      try {
        await plansService.create(productReferenceCode, createParams);
      } catch (error) {
        caughtError = error;
      }

      // Assert
      expect(caughtError).toBeInstanceOf(IyzicoApiError);
      const err = caughtError as IyzicoApiError;
      expect(err.statusCode).toBe(400);
      expect(err.isClientError()).toBe(true);
      expect(mockClient.request).toHaveBeenCalledOnce();
    });

    test('should handle network errors', async () => {
      // Arrange
      const productReferenceCode = 'PROD_NETWORK_ERROR';
      const createParams = {
        name: 'Network Test Plan',
        price: 19.99,
        paymentInterval: PaymentInterval.MONTHLY,
        paymentIntervalCount: 1,
        planPaymentType: PlanPaymentType.RECURRING,
        currencyCode: CurrencyCode.TRY,
      };

      const networkError = new IyzicoNetworkError('Network connection failed');
      mockClient.request = vi.fn().mockRejectedValue(networkError);

      // Act & Assert
      await expect(
        plansService.create(productReferenceCode, createParams)
      ).rejects.toThrow(IyzicoNetworkError);

      expect(mockClient.request).toHaveBeenCalledOnce();
    });
  });

  describe('update', () => {
    test('should make successful payment plan update request', async () => {
      // Arrange
      const pricingPlanReferenceCode = 'PLAN_123';
      const updateParams = {
        name: 'Updated Premium Plan',
        trialPeriodDays: 14,
      };

      const mockUpdatedPlanData: BasePaymentPlanData = {
        referenceCode: 'PLAN_123',
        createdDate: 1640995200000,
        name: 'Updated Premium Plan',
        price: 29.99,
        paymentInterval: PaymentInterval.MONTHLY,
        paymentIntervalCount: 1,
        trialPeriodDays: 14,
        currencyCode: CurrencyCode.TRY,
        productReferenceCode: 'PROD_123456',
        planPaymentType: PlanPaymentType.RECURRING,
        status: Status.ACTIVE,
        recurrenceCount: 12,
      };

      const expectedResponse: UpdatePaymentPlanResponse = {
        status: 'success',
        systemTime: 1640995200000,
        data: mockUpdatedPlanData,
      };

      mockClient.request = vi.fn().mockResolvedValue(expectedResponse);

      // Act
      const result = await plansService.update(pricingPlanReferenceCode, updateParams);

      // Assert
      expect(result).toEqual(expectedResponse);
      expect(mockClient.request).toHaveBeenCalledOnce();
      expect(mockClient.request).toHaveBeenCalledWith({
        path: `/v2/subscription/pricing-plans/${pricingPlanReferenceCode}`,
        method: 'POST',
        body: {
          conversationId: expect.stringMatching(/^plan-update-\d+$/),
          pricingPlanReferenceCode: 'PLAN_123',
          name: 'Updated Premium Plan',
          trialPeriodDays: 14,
        },
      });
    });

    test('should merge default parameters with provided parameters', async () => {
      // Arrange
      const pricingPlanReferenceCode = 'PLAN_456';
      const updateParams = {
        name: 'Updated Basic Plan',
        conversationId: 'custom-update-id', // This should override the default
        locale: 'en', // This should be preserved
      };

      const mockResponse: UpdatePaymentPlanResponse = {
        status: 'success',
        systemTime: 1640995200000,
        data: {
          referenceCode: 'PLAN_456',
          createdDate: 1640995200000,
          name: 'Updated Basic Plan',
          price: 19.99,
          paymentInterval: PaymentInterval.MONTHLY,
          paymentIntervalCount: 1,
          trialPeriodDays: 0,
          currencyCode: CurrencyCode.TRY,
          productReferenceCode: 'PROD_456',
          planPaymentType: PlanPaymentType.RECURRING,
          status: Status.ACTIVE,
          recurrenceCount: 6,
        },
      };

      mockClient.request = vi.fn().mockResolvedValue(mockResponse);

      // Act
      await plansService.update(pricingPlanReferenceCode, updateParams);

      // Assert
      expect(mockClient.request).toHaveBeenCalledWith({
        path: `/v2/subscription/pricing-plans/${pricingPlanReferenceCode}`,
        method: 'POST',
        body: {
          conversationId: 'custom-update-id', // Custom value should override default
          pricingPlanReferenceCode: 'PLAN_456',
          name: 'Updated Basic Plan',
          locale: 'en', // Custom locale should be preserved
        },
      });
    });

    test('should handle plan not found error', async () => {
      // Arrange
      const pricingPlanReferenceCode = 'PLAN_NOT_EXISTS';
      const updateParams = {
        name: 'Valid Name',
      };

      const notFoundError = new IyzicoApiError('Plan not found', 404, {
        status: 'failure',
        errorMessage: 'Plan not found',
        errorCode: 'PLAN_NOT_FOUND',
      });
      mockClient.request = vi.fn().mockRejectedValue(notFoundError);

      // Act & Assert
      await expect(
        plansService.update(pricingPlanReferenceCode, updateParams)
      ).rejects.toThrow(IyzicoApiError);

      try {
        await plansService.update(pricingPlanReferenceCode, updateParams);
      } catch (error) {
        if (error instanceof IyzicoApiError) {
          expect(error.statusCode).toBe(404);
          expect(error.isClientError()).toBe(true);
        }
      }
    });
  });

  describe('delete', () => {
    test('should make successful payment plan deletion request', async () => {
      // Arrange
      const pricingPlanReferenceCode = 'PLAN_TO_DELETE';
      const expectedResponse: DeletePaymentPlanResponse = {
        status: 'success',
        systemTime: 1640995200000,
      };

      mockClient.request = vi.fn().mockResolvedValue(expectedResponse);

      // Act
      const result = await plansService.delete(pricingPlanReferenceCode);

      // Assert
      expect(result).toEqual(expectedResponse);
      expect(mockClient.request).toHaveBeenCalledOnce();
      expect(mockClient.request).toHaveBeenCalledWith({
        path: `/v2/subscription/pricing-plans/${pricingPlanReferenceCode}`,
        method: 'DELETE',
      });
    });

    test('should handle plan not found during deletion', async () => {
      // Arrange
      const pricingPlanReferenceCode = 'PLAN_NOT_EXISTS';
      const notFoundError = new IyzicoApiError('Plan not found', 404, {
        status: 'failure',
        errorMessage: 'Plan not found',
        errorCode: 'PLAN_NOT_FOUND',
      });
      mockClient.request = vi.fn().mockRejectedValue(notFoundError);

      // Act & Assert
      await expect(plansService.delete(pricingPlanReferenceCode)).rejects.toThrow(
        IyzicoApiError
      );

      expect(mockClient.request).toHaveBeenCalledWith({
        path: `/v2/subscription/pricing-plans/${pricingPlanReferenceCode}`,
        method: 'DELETE',
      });
    });

    test('should handle plan with active subscriptions error', async () => {
      // Arrange
      const pricingPlanReferenceCode = 'PLAN_WITH_SUBS';
      const activeSubsError = new IyzicoApiError(
        'Cannot delete plan with active subscriptions',
        400,
        {
          status: 'failure',
          errorMessage: 'Cannot delete plan with active subscriptions',
          errorCode: 'PLAN_HAS_ACTIVE_SUBSCRIPTIONS',
        }
      );
      mockClient.request = vi.fn().mockRejectedValue(activeSubsError);

      // Act & Assert
      await expect(plansService.delete(pricingPlanReferenceCode)).rejects.toThrow(
        IyzicoApiError
      );

      try {
        await plansService.delete(pricingPlanReferenceCode);
      } catch (error) {
        if (error instanceof IyzicoApiError) {
          expect(error.statusCode).toBe(400);
          expect(error.isClientError()).toBe(true);
        }
      }
    });
  });

  describe('retrieve', () => {
    test('should make successful payment plan retrieval request', async () => {
      // Arrange
      const pricingPlanReferenceCode = 'PLAN_RETRIEVE_TEST';
      const mockPlanData: BasePaymentPlanData = {
        referenceCode: 'PLAN_RETRIEVE_TEST',
        createdDate: 1640995200000,
        name: 'Retrieved Plan',
        price: 49.99,
        paymentInterval: PaymentInterval.MONTHLY,
        paymentIntervalCount: 1,
        trialPeriodDays: 7,
        currencyCode: CurrencyCode.USD,
        productReferenceCode: 'PROD_RETRIEVE_TEST',
        planPaymentType: PlanPaymentType.RECURRING,
        status: Status.ACTIVE,
        recurrenceCount: 24,
      };

      const expectedResponse: GetPaymentPlanResponse = {
        status: 'success',
        systemTime: 1640995200000,
        data: mockPlanData,
      };

      mockClient.request = vi.fn().mockResolvedValue(expectedResponse);

      // Act
      const result = await plansService.retrieve(pricingPlanReferenceCode);

      // Assert
      expect(result).toEqual(expectedResponse);
      expect(mockClient.request).toHaveBeenCalledOnce();
      expect(mockClient.request).toHaveBeenCalledWith({
        path: `/v2/subscription/pricing-plans/${pricingPlanReferenceCode}`,
        method: 'GET',
      });
    });

    test('should handle plan not found during retrieval', async () => {
      // Arrange
      const pricingPlanReferenceCode = 'PLAN_NOT_EXISTS';
      const notFoundError = new IyzicoApiError('Plan not found', 404, {
        status: 'failure',
        errorMessage: 'Plan not found',
        errorCode: 'PLAN_NOT_FOUND',
      });
      mockClient.request = vi.fn().mockRejectedValue(notFoundError);

      // Act & Assert
      await expect(plansService.retrieve(pricingPlanReferenceCode)).rejects.toThrow(
        IyzicoApiError
      );

      expect(mockClient.request).toHaveBeenCalledWith({
        path: `/v2/subscription/pricing-plans/${pricingPlanReferenceCode}`,
        method: 'GET',
      });
    });
  });

  describe('list', () => {
    test('should make successful payment plans list request with default pagination', async () => {
      // Arrange
      const productReferenceCode = 'PROD_LIST_TEST';
      const mockPlansData: BasePaymentPlanData[] = [
        {
          referenceCode: 'PLAN_001',
          createdDate: 1640995200000,
          name: 'Basic Plan',
          price: 9.99,
          paymentInterval: PaymentInterval.MONTHLY,
          paymentIntervalCount: 1,
          trialPeriodDays: 0,
          currencyCode: CurrencyCode.TRY,
          productReferenceCode: 'PROD_LIST_TEST',
          planPaymentType: PlanPaymentType.RECURRING,
          status: Status.ACTIVE,
          recurrenceCount: 12,
        },
        {
          referenceCode: 'PLAN_002',
          createdDate: 1640995260000,
          name: 'Premium Plan',
          price: 29.99,
          paymentInterval: PaymentInterval.MONTHLY,
          paymentIntervalCount: 1,
          trialPeriodDays: 7,
          currencyCode: CurrencyCode.TRY,
          productReferenceCode: 'PROD_LIST_TEST',
          planPaymentType: PlanPaymentType.RECURRING,
          status: Status.ACTIVE,
          recurrenceCount: 12,
        },
      ];

      const expectedResponse: ListPaymentPlansResponse = {
        status: 'success',
        systemTime: 1640995200000,
        data: {
          items: mockPlansData,
          currentPage: 1,
          pageCount: 1,
          totalCount: 2,
        },
      };

      mockClient.request = vi.fn().mockResolvedValue(expectedResponse);

      // Act
      const result = await plansService.list(productReferenceCode);

      // Assert
      expect(result).toEqual(expectedResponse);
      expect(mockClient.request).toHaveBeenCalledOnce();
      expect(mockClient.request).toHaveBeenCalledWith({
        path: `/v2/subscription/products/${productReferenceCode}/pricing-plans?page=1&count=10`,
        method: 'GET',
      });

      expect(result.data?.items).toHaveLength(2);
      expect(result.data?.currentPage).toBe(1);
      expect(result.data?.totalCount).toBe(2);
    });

    test('should make successful payment plans list request with custom pagination', async () => {
      // Arrange
      const productReferenceCode = 'PROD_PAGINATION_TEST';
      const page = 2;
      const count = 5;

      const mockPlansData: BasePaymentPlanData[] = Array.from(
        { length: count },
        (_, index) => ({
          referenceCode: `PLAN_${(index + 6).toString().padStart(3, '0')}`, // Plans 006-010 for page 2
          createdDate: 1640995200000 + index * 1000,
          name: `Plan ${index + 6}`,
          price: (index + 6) * 10,
          paymentInterval: PaymentInterval.MONTHLY,
          paymentIntervalCount: 1,
          trialPeriodDays: index % 2 === 0 ? 0 : 7,
          currencyCode: CurrencyCode.TRY,
          productReferenceCode: 'PROD_PAGINATION_TEST',
          planPaymentType: PlanPaymentType.RECURRING,
          status: Status.ACTIVE,
          recurrenceCount: 12,
        })
      );

      const expectedResponse: ListPaymentPlansResponse = {
        status: 'success',
        systemTime: 1640995200000,
        data: {
          items: mockPlansData,
          currentPage: 2,
          pageCount: 3,
          totalCount: 15,
        },
      };

      mockClient.request = vi.fn().mockResolvedValue(expectedResponse);

      // Act
      const result = await plansService.list(productReferenceCode, page, count);

      // Assert
      expect(result).toEqual(expectedResponse);
      expect(mockClient.request).toHaveBeenCalledOnce();
      expect(mockClient.request).toHaveBeenCalledWith({
        path: `/v2/subscription/products/${productReferenceCode}/pricing-plans?page=${page}&count=${count}`,
        method: 'GET',
      });

      expect(result.data?.items).toHaveLength(5);
      expect(result.data?.currentPage).toBe(2);
      expect(result.data?.totalCount).toBe(15);
    });

    test('should handle empty plans list', async () => {
      // Arrange
      const productReferenceCode = 'PROD_NO_PLANS';
      const expectedResponse: ListPaymentPlansResponse = {
        status: 'success',
        systemTime: 1640995200000,
        data: {
          items: [],
          currentPage: 1,
          pageCount: 0,
          totalCount: 0,
        },
      };

      mockClient.request = vi.fn().mockResolvedValue(expectedResponse);

      // Act
      const result = await plansService.list(productReferenceCode);

      // Assert
      expect(result.data?.items).toHaveLength(0);
      expect(result.data?.totalCount).toBe(0);
      expect(result.data?.pageCount).toBe(0);
    });

    test('should handle product not found during list', async () => {
      // Arrange
      const productReferenceCode = 'PROD_NOT_EXISTS';
      const notFoundError = new IyzicoApiError('Product not found', 404, {
        status: 'failure',
        errorMessage: 'Product not found',
        errorCode: 'PRODUCT_NOT_FOUND',
      });
      mockClient.request = vi.fn().mockRejectedValue(notFoundError);

      // Act & Assert
      await expect(plansService.list(productReferenceCode)).rejects.toThrow(
        IyzicoApiError
      );

      expect(mockClient.request).toHaveBeenCalledWith({
        path: `/v2/subscription/products/${productReferenceCode}/pricing-plans?page=1&count=10`,
        method: 'GET',
      });
    });

    test('should handle large plans list with different statuses', async () => {
      // Arrange
      const productReferenceCode = 'PROD_LARGE_LIST';
      const count = 50;
      const largePlansList: BasePaymentPlanData[] = Array.from(
        { length: count },
        (_, index) => ({
          referenceCode: `PLAN_${index.toString().padStart(4, '0')}`,
          createdDate: 1640995200000 + index * 1000,
          name: `Plan ${index + 1}`,
          price: (index + 1) * 5,
          paymentInterval:
            index % 3 === 0
              ? PaymentInterval.MONTHLY
              : index % 3 === 1
              ? PaymentInterval.YEARLY
              : PaymentInterval.WEEKLY,
          paymentIntervalCount: index % 2 === 0 ? 1 : 2,
          trialPeriodDays: index % 4 === 0 ? 0 : 7,
          currencyCode: index % 2 === 0 ? CurrencyCode.TRY : CurrencyCode.USD,
          productReferenceCode: 'PROD_LARGE_LIST',
          planPaymentType: PlanPaymentType.RECURRING,
          status: index % 3 === 0 ? Status.ACTIVE : Status.INACTIVE,
          recurrenceCount: index % 5 === 0 ? undefined : 12,
        })
      );

      const expectedResponse: ListPaymentPlansResponse = {
        status: 'success',
        systemTime: 1640995200000,
        data: {
          items: largePlansList,
          currentPage: 1,
          pageCount: 1,
          totalCount: count,
        },
      };

      mockClient.request = vi.fn().mockResolvedValue(expectedResponse);

      // Act
      const result = await plansService.list(productReferenceCode, 1, count);

      // Assert
      expect(result.data?.items).toHaveLength(count);
      expect(result.data?.items?.[0].referenceCode).toBe('PLAN_0000');
      expect(result.data?.items?.[count - 1].referenceCode).toBe(`PLAN_${(count - 1).toString().padStart(4, '0')}`);
      
      const activeCount = result.data?.items?.filter((p) => p.status === Status.ACTIVE).length;
      const inactiveCount = result.data?.items?.filter((p) => p.status === Status.INACTIVE).length;
      expect(activeCount).toBe(Math.ceil(count / 3));
      expect(inactiveCount).toBe(count - Math.ceil(count / 3));
    });

    test('should handle service unavailable error (503)', async () => {
      // Arrange
      const productReferenceCode = 'PROD_SERVICE_ERROR';
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
      await expect(plansService.list(productReferenceCode)).rejects.toThrow(IyzicoApiError);

      try {
        await plansService.list(productReferenceCode);
      } catch (error) {
        if (error instanceof IyzicoApiError) {
          expect(error.statusCode).toBe(503);
          expect(error.isServerError()).toBe(true);
          expect(error.isRetryable()).toBe(true);
        }
      }
    });
  });

  // Performance and behavior tests
  describe('performance and behavior', () => {
    test('should handle concurrent requests correctly', async () => {
      // Arrange
      const productReferenceCodes = ['PROD_1', 'PROD_2', 'PROD_3'];
      const createRequests = productReferenceCodes.map((code, index) => ({
        productReferenceCode: code,
        params: {
          name: `Concurrent Plan ${index + 1}`,
          price: (index + 1) * 10,
          paymentInterval: PaymentInterval.MONTHLY,
          paymentIntervalCount: 1,
          planPaymentType: PlanPaymentType.RECURRING,
          currencyCode: CurrencyCode.TRY,
        },
      }));

      const mockResponses = createRequests.map((req, index) => ({
        status: 'success',
        systemTime: 1640995200000 + index,
        data: {
          referenceCode: `PLAN_${index + 1}`,
          createdDate: 1640995200000 + index,
          name: req.params.name,
          price: req.params.price,
          paymentInterval: PaymentInterval.MONTHLY,
          paymentIntervalCount: 1,
          trialPeriodDays: 0,
          currencyCode: 'TRY',
          productReferenceCode: req.productReferenceCode,
          planPaymentType: 'RECURRING',
          status: 'ACTIVE',
          recurrenceCount: 0,
        },
      }));

      mockClient.request = vi
        .fn()
        .mockResolvedValueOnce(mockResponses[0])
        .mockResolvedValueOnce(mockResponses[1])
        .mockResolvedValueOnce(mockResponses[2]);

      // Act
      const promises = createRequests.map((req) =>
        plansService.create(req.productReferenceCode, req.params)
      );
      const results = await Promise.all(promises);

      // Assert
      expect(results).toHaveLength(3);
      expect(mockClient.request).toHaveBeenCalledTimes(3);
      results.forEach((result, index) => {
        expect(result.data?.name).toBe(`Concurrent Plan ${index + 1}`);
        expect(result.data?.referenceCode).toBe(`PLAN_${index + 1}`);
      });
    });

    test('should preserve request order in method calls', async () => {
      // Arrange
      const pricingPlanReferenceCode = 'PLAN_ORDER_TEST';
      const updateParams = {
        name: 'Updated Name',
        trialPeriodDays: 14,
      };

      const mockResponse: UpdatePaymentPlanResponse = {
        status: 'success',
        systemTime: 1640995200000,
        data: {
          referenceCode: pricingPlanReferenceCode,
          createdDate: 1640995200000,
          name: 'Updated Name',
          price: 29.99,
          paymentInterval: PaymentInterval.MONTHLY,
          paymentIntervalCount: 1,
          trialPeriodDays: 14,
          currencyCode: CurrencyCode.TRY,
          productReferenceCode: 'PROD_ORDER_TEST',
          planPaymentType: PlanPaymentType.RECURRING,
          status: Status.ACTIVE,
          recurrenceCount: 12,
        },
      };

      mockClient.request = vi.fn().mockResolvedValue(mockResponse);

      // Act
      await plansService.update(pricingPlanReferenceCode, updateParams);

      // Assert - Check that the parameters are passed in the correct order
      const [callArgs] = (mockClient.request as ReturnType<typeof vi.fn>).mock
        .calls[0] as [
        { path: string; method: string; body: Record<string, unknown> },
      ];
      expect(callArgs.body.conversationId).toMatch(/^plan-update-\d+$/);
      expect(callArgs.body.pricingPlanReferenceCode).toBe(pricingPlanReferenceCode);
      expect(callArgs.body.name).toBe('Updated Name');
      expect(callArgs.body.trialPeriodDays).toBe(14);
    });

    test('should handle method chaining correctly', async () => {
      // Arrange
      const productReferenceCode = 'PROD_CHAIN_TEST';
      const createParams = {
        name: 'Chain Test Plan',
        price: 39.99,
        paymentInterval: PaymentInterval.MONTHLY,
        paymentIntervalCount: 1,
        planPaymentType: PlanPaymentType.RECURRING,
        currencyCode: CurrencyCode.TRY,
      };

      const createResponse: PaymentPlanResponse = {
        status: 'success',
        systemTime: 1640995200000,
        data: {
          referenceCode: 'PLAN_CHAIN_TEST',
          createdDate: 1640995200000,
          name: 'Chain Test Plan',
          price: 39.99,
          paymentInterval: 'MONTH',
          paymentIntervalCount: 1,
          trialPeriodDays: 0,
          currencyCode: 'TRY',
          productReferenceCode: 'PROD_CHAIN_TEST',
          planPaymentType: 'RECURRING',
          status: 'ACTIVE',
          recurrenceCount: 0,
        },
      };

      const retrieveResponse: GetPaymentPlanResponse = {
        status: 'success',
        systemTime: 1640995200000,
        data: {
          referenceCode: 'PLAN_CHAIN_TEST',
          createdDate: 1640995200000,
          name: 'Chain Test Plan',
          price: 39.99,
          paymentInterval: PaymentInterval.MONTHLY,
          paymentIntervalCount: 1,
          trialPeriodDays: 0,
          currencyCode: CurrencyCode.TRY,
          productReferenceCode: 'PROD_CHAIN_TEST',
          planPaymentType: PlanPaymentType.RECURRING,
          status: Status.ACTIVE,
          recurrenceCount: 0,
        },
      };

      mockClient.request = vi
        .fn()
        .mockResolvedValueOnce(createResponse) // For create
        .mockResolvedValueOnce(retrieveResponse); // For retrieve

      // Act
      const createResult = await plansService.create(productReferenceCode, createParams);
      const retrieveResult = await plansService.retrieve(
        createResult.data!.referenceCode
      );

      // Assert
      expect(createResult.data?.referenceCode).toBe('PLAN_CHAIN_TEST');
      expect(retrieveResult.data?.referenceCode).toBe('PLAN_CHAIN_TEST');
      expect(retrieveResult.data?.name).toBe('Chain Test Plan');
      expect(mockClient.request).toHaveBeenCalledTimes(2);
    });
  });
});