// packages/iyzico-sdk-ts/src/services/health.ts
import type { IyzicoClient } from '../client';
import type { BinCheckRequest, BinCheckResponse } from '../types';

export class HealthService {
  constructor(private client: IyzicoClient) {}

  async checkBin(params: BinCheckRequest): Promise<BinCheckResponse> {
    console.log('[HEALTH_SERVICE] checkBin called with params:', params);
    const requestPayload = {
      path: '/payment/bin/check',
      method: 'POST',
      body: { locale: 'tr', conversationId: 'docsTest-v1', ...params },
    };
    console.log('[HEALTH_SERVICE] Making client request with:', requestPayload);

    try {
      const result = await this.client.request(requestPayload);
      console.log('[HEALTH_SERVICE] Client request completed:', result);
      return result as BinCheckResponse;
    } catch (error) {
      console.error('[HEALTH_SERVICE] Client request failed:', error);
      throw error;
    }
  }
}
