// packages/iyzico-sdk-ts/src/types/health.ts

import { BaseRequest, BaseResponse } from './core';

/**
 * BIN check data returned by the API
 */
export interface BinCheckData {
  binNumber: string;
  cardType: string;
  cardAssociation: string;
  cardFamily: string;
  bankName: string;
  bankCode: number;
  commercial?: number;
}

/**
 * Request payload for BIN (Bank Identification Number) check
 */
export interface BinCheckRequest extends BaseRequest {
  binNumber: string;
}

/**
 * Response data from BIN check operation
 */
export interface BinCheckResponse extends BaseResponse<BinCheckData> {}
