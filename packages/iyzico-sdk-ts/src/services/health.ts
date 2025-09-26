// packages/iyzico-sdk-ts/src/services/health.ts
import type { IyzicoClient } from '../client';
import type { BinCheckRequest, BinCheckResponse } from '../types';

export class HealthService {
  constructor(private client: IyzicoClient) {}

  async checkBin(params: BinCheckRequest): Promise<BinCheckResponse> {
    return this.client.request({
      path: '/payment/bin/check',
      method: 'POST',
      body: { conversationId: 'docsTest-v1', ...params },
    });
  }
}
