import { vi, test, expect, describe, beforeEach, afterEach } from 'vitest';
import { HealthService } from '../src/services/health';
import type { IyzicoClient } from '../src/client';
import type { BinCheckRequest, BinCheckResponse, BinCheckData } from '../src/types';

// Create a mock client
const mockClient = {
  request: vi.fn(),
} as unknown as IyzicoClient;

describe('HealthService', () => {
  let healthService: HealthService;

  beforeEach(() => {
    healthService = new HealthService(mockClient);
    vi.clearAllMocks();
  });


  describe('checkBin', () => {
    test('should make successful BIN check request', async () => {
      // Arrange
      const binCheckRequest: BinCheckRequest = {
        binNumber: '554960',
      };

      const mockBinData: BinCheckData = {
        binNumber: '554960',
        cardType: 'DEBIT_CARD',
        cardAssociation: 'MASTER_CARD',
        cardFamily: 'Bonus',
        bankName: 'Garanti Bankası',
        bankCode: 62,
        commercial: 0,
      };

      const expectedResponse: BinCheckResponse = {
        status: 'success',
        systemTime: 1640995200000,
        data: mockBinData,
      };

      mockClient.request = vi.fn().mockResolvedValue(expectedResponse);

      // Act
      const result = await healthService.checkBin(binCheckRequest);

      // Assert
      expect(result).toEqual(expectedResponse);
      expect(mockClient.request).toHaveBeenCalledOnce();
      expect(mockClient.request).toHaveBeenCalledWith({
        path: '/payment/bin/check',
        method: 'POST',
        body: {
          locale: 'tr',
          conversationId: 'docsTest-v1',
          binNumber: '554960',
        },
      });
    });

    test('should merge default parameters with provided parameters', async () => {
      // Arrange
      const binCheckRequest: BinCheckRequest = {
        binNumber: '450803',
        conversationId: 'custom-conversation-id', // This should override the default
      };

      const mockResponse: BinCheckResponse = {
        status: 'success',
        systemTime: 1640995200000,
        data: {
          binNumber: '450803',
          cardType: 'CREDIT_CARD',
          cardAssociation: 'VISA',
          cardFamily: 'Maximum',
          bankName: 'İş Bankası',
          bankCode: 64,
          commercial: 1,
        },
      };

      mockClient.request = vi.fn().mockResolvedValue(mockResponse);

      // Act
      await healthService.checkBin(binCheckRequest);

      // Assert
      expect(mockClient.request).toHaveBeenCalledWith({
        path: '/payment/bin/check',
        method: 'POST',
        body: {
          locale: 'tr',
          conversationId: 'custom-conversation-id', // Custom value should override default
          binNumber: '450803',
        },
      });
    });

    test('should handle API errors gracefully', async () => {
      // Arrange
      const binCheckRequest: BinCheckRequest = {
        binNumber: '000000', // Invalid BIN
      };

      const apiError = new Error('Invalid BIN number');
      mockClient.request = vi.fn().mockRejectedValue(apiError);

      // Act & Assert
      await expect(healthService.checkBin(binCheckRequest)).rejects.toThrow(
        'Invalid BIN number'
      );

      expect(mockClient.request).toHaveBeenCalledOnce();
      expect(mockClient.request).toHaveBeenCalledWith({
        path: '/payment/bin/check',
        method: 'POST',
        body: {
          locale: 'tr',
          conversationId: 'docsTest-v1',
          binNumber: '000000',
        },
      });
    });

    test('should handle network errors', async () => {
      // Arrange
      const binCheckRequest: BinCheckRequest = {
        binNumber: '554960',
      };

      const networkError = new Error('Network timeout');
      mockClient.request = vi.fn().mockRejectedValue(networkError);

      // Act & Assert
      await expect(healthService.checkBin(binCheckRequest)).rejects.toThrow(
        'Network timeout'
      );

      expect(mockClient.request).toHaveBeenCalledOnce();
    });

    test('should work with different BIN numbers', async () => {
      // Arrange
      const testCases = [
        {
          binNumber: '540667', // Another valid BIN
          expectedCardType: 'CREDIT_CARD',
          expectedCardAssociation: 'MASTER_CARD',
        },
        {
          binNumber: '473053',
          expectedCardType: 'CREDIT_CARD', 
          expectedCardAssociation: 'VISA',
        },
      ];

      for (const testCase of testCases) {
        const binCheckRequest: BinCheckRequest = {
          binNumber: testCase.binNumber,
        };

        const mockResponse: BinCheckResponse = {
          status: 'success',
          systemTime: 1640995200000,
          data: {
            binNumber: testCase.binNumber,
            cardType: testCase.expectedCardType,
            cardAssociation: testCase.expectedCardAssociation,
            cardFamily: 'Test Family',
            bankName: 'Test Bank',
            bankCode: 1,
          },
        };

        mockClient.request = vi.fn().mockResolvedValue(mockResponse);

        // Act
        const result = await healthService.checkBin(binCheckRequest);

        // Assert
        expect(result.data?.binNumber).toBe(testCase.binNumber);
        expect(result.data?.cardType).toBe(testCase.expectedCardType);
        expect(result.data?.cardAssociation).toBe(testCase.expectedCardAssociation);
        expect(mockClient.request).toHaveBeenCalledWith({
          path: '/payment/bin/check',
          method: 'POST',
          body: {
            locale: 'tr',
            conversationId: 'docsTest-v1',
            binNumber: testCase.binNumber,
          },
        });

        // Reset for next iteration
        vi.clearAllMocks();
      }
    });

    test('should preserve additional request properties', async () => {
      // Arrange
      const binCheckRequest: BinCheckRequest = {
        binNumber: '554960',
        locale: 'en', // Custom locale
      };

      const mockResponse: BinCheckResponse = {
        status: 'success',
        systemTime: 1640995200000,
        data: {
          binNumber: '554960',
          cardType: 'DEBIT_CARD',
          cardAssociation: 'MASTER_CARD',
          cardFamily: 'Bonus',
          bankName: 'Garanti Bankası',
          bankCode: 62,
        },
      };

      mockClient.request = vi.fn().mockResolvedValue(mockResponse);

      // Act
      await healthService.checkBin(binCheckRequest);

      // Assert
      expect(mockClient.request).toHaveBeenCalledWith({
        path: '/payment/bin/check',
        method: 'POST',
        body: {
          locale: 'en', // Should use custom locale, not default 'tr'
          conversationId: 'docsTest-v1',
          binNumber: '554960',
        },
      });
    });
  });
});
