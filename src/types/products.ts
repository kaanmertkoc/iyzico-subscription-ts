import { PricingPlan } from './plans';
import { BaseRequest, BaseResponse, SimpleResponse } from './core';

/**
 * Product data structure returned by the API
 */
export interface ProductData {
  referenceCode: string;
  createdDate: number;
  name: string;
  description?: string;
  status: string;
  pricingPlans: PricingPlan[];
}

/**
 * Request payload for creating a new product
 */
export interface CreateProductRequest extends BaseRequest {
  name: string;
  description?: string;
}

/**
 * Response data when creating a product
 */
export interface CreateProductResponse extends BaseResponse<ProductData> {}

/**
 * Request payload for updating an existing product
 */
export interface UpdateProductRequest extends BaseRequest {
  productReferenceCode: string;
  name: string;
  description?: string;
}

/**
 * Response data when updating a product
 */
export interface UpdateProductResponse extends BaseResponse<ProductData> {}

/**
 * Response data when deleting a product
 */
export interface DeleteProductResponse extends SimpleResponse {}
