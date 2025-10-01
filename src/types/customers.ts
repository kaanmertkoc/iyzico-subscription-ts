import type { BaseCustomer, BaseRequest, BaseResponse } from './core';

/**
 * Request payload for updating an existing customer
 */
export interface UpdateCustomerRequest extends BaseRequest, BaseCustomer {}

/**
 * Response data when updating a customer
 */
export interface UpdateCustomerResponse extends BaseResponse<BaseCustomer> {}
