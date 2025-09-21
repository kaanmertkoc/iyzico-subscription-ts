import type { IyzicoClient } from '../client';
import type {
  CreateProductRequest,
  CreateProductResponse,
  UpdateProductRequest,
  UpdateProductResponse,
  DeleteProductResponse,
  ProductData,
  BaseResponse,
} from '../types';

/**
 * Service for managing products in the Iyzico subscription system
 */
export class ProductsService {
  constructor(private client: IyzicoClient) {}

  /**
   * Creates a new product
   * @param params - Product creation parameters
   * @returns Promise resolving to the created product data
   */
  async create(params: CreateProductRequest): Promise<CreateProductResponse> {
    return this.client.request<CreateProductResponse>({
      path: '/v2/subscription/products',
      method: 'POST',
      body: { 
        locale: 'tr', 
        conversationId: `product-create-${Date.now()}`,
        ...params 
      },
    });
  }

  /**
   * Updates an existing product
   * @param referenceCode - The product reference code to update
   * @param params - Product update parameters
   * @returns Promise resolving to the updated product data
   */
  async update(
    referenceCode: string, 
    params: Omit<UpdateProductRequest, 'productReferenceCode'>
  ): Promise<UpdateProductResponse> {
    return this.client.request<UpdateProductResponse>({
      path: `/v2/subscription/products/${referenceCode}`,
      method: 'POST',
      body: { 
        locale: 'tr',
        conversationId: `product-update-${Date.now()}`,
        productReferenceCode: referenceCode, 
        ...params 
      },
    });
  }

  /**
   * Deletes a product
   * @param referenceCode - The product reference code to delete
   * @returns Promise resolving to the deletion response
   */
  async delete(referenceCode: string): Promise<DeleteProductResponse> {
    return this.client.request<DeleteProductResponse>({
      path: `/v2/subscription/products/${referenceCode}`,
      method: 'DELETE',
    });
  }

  /**
   * Retrieves a specific product by its reference code
   * @param referenceCode - The product reference code to retrieve
   * @returns Promise resolving to the product data
   */
  async retrieve(referenceCode: string): Promise<BaseResponse<ProductData>> {
    return this.client.request<BaseResponse<ProductData>>({
      path: `/v2/subscription/products/${referenceCode}`,
      method: 'GET',
    });
  }

  /**
   * Lists all products
   * @returns Promise resolving to the list of products
   */
  async list(): Promise<BaseResponse<ProductData[]>> {
    return this.client.request<BaseResponse<ProductData[]>>({
      path: '/v2/subscription/products',
      method: 'GET',
    });
  }
}
