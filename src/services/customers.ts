import type { IyzicoClient } from '../client';
import type {
  BaseResponse,
  UpdateCustomerRequest,
  UpdateCustomerResponse,
  ListCustomersResponse,
} from '../types';
import { BaseCustomer } from '../types/core';

/**
 * Service for managing customers in the Iyzico subscription system
 */
export class CustomersService {
  constructor(private client: IyzicoClient) {}

  /**
   * Updates an existing customer
   * @param referenceCode - The customer reference code to update
   * @param params - Customer update parameters
   * @returns Promise resolving to the updated customer data
   */
  async update(
    referenceCode: string,
    params: UpdateCustomerRequest
  ): Promise<UpdateCustomerResponse> {
    return this.client.request<UpdateCustomerResponse>({
      path: `/v2/subscription/customers/${referenceCode}`,
      method: 'POST',
      body: {
        conversationId: `customer-update-${Date.now()}`,
        ...params,
      },
    });
  }

  /**
   * Retrieves a specific customer by its reference code
   * @param referenceCode - The customer reference code to retrieve
   * @returns Promise resolving to the customer data
   */
  async retrieve(referenceCode: string): Promise<BaseResponse<BaseCustomer>> {
    return this.client.request<BaseResponse<BaseCustomer>>({
      path: `/v2/subscription/customers/${referenceCode}`,
      method: 'GET',
    });
  }

  /**
   * Lists all customers
   * @returns Promise resolving to the list of customers
   */
  async list(): Promise<ListCustomersResponse> {
    return this.client.request<ListCustomersResponse>({
      path: '/v2/subscription/customers',
      method: 'GET',
    });
  }
}
