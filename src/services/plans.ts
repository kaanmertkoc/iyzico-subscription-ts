import type { IyzicoClient } from '../client';
import type {
  CreatePaymentPlanRequest,
  DeletePaymentPlanResponse,
  GetPaymentPlanResponse,
  ListPaymentPlansResponse,
  PaymentPlanResponse,
  UpdatePaymentPlanRequest,
  UpdatePaymentPlanResponse,
} from '../types';

/**
 * Service for managing payment plans in the Iyzico subscription system
 */
export class PlansService {
  constructor(private client: IyzicoClient) {}

  /**
   * Creates a new payment plan for a product
   * @param productReferenceCode - The product reference code to create the plan for
   * @param params - Payment plan creation parameters
   * @returns Promise resolving to the created payment plan data
   */
  async create(
    productReferenceCode: string,
    params: Omit<CreatePaymentPlanRequest, 'productReferenceCode'>
  ): Promise<PaymentPlanResponse> {
    const requestBody: CreatePaymentPlanRequest = {
      conversationId: `plan-create-${Date.now()}`,
      productReferenceCode,
      ...params,
    };

    return this.client.request<PaymentPlanResponse>({
      path: `/v2/subscription/products/${productReferenceCode}/pricing-plans`,
      method: 'POST',
      body: requestBody,
    });
  }

  /**
   * Updates an existing payment plan
   * @param pricingPlanReferenceCode - The pricing plan reference code to update
   * @param params - Payment plan update parameters
   * @returns Promise resolving to the updated payment plan data
   */
  async update(
    pricingPlanReferenceCode: string,
    params: Omit<UpdatePaymentPlanRequest, 'pricingPlanReferenceCode'>
  ): Promise<UpdatePaymentPlanResponse> {
    const requestBody: UpdatePaymentPlanRequest = {
      conversationId: `plan-update-${Date.now()}`,
      pricingPlanReferenceCode,
      ...params,
    };

    return this.client.request<UpdatePaymentPlanResponse>({
      path: `/v2/subscription/pricing-plans/${pricingPlanReferenceCode}`,
      method: 'POST',
      body: requestBody,
    });
  }

  /**
   * Deletes a payment plan
   *
   * **⚠️ WARNING: This endpoint appears to be non-functional in Iyzico's API**
   *
   * Based on testing, Iyzico's DELETE endpoint for pricing plans consistently returns:
   * - Status: 404
   * - Error Code: "1" (System error)
   * - Message: "Sistem hatası"
   *
   * This occurs even when the plan exists and is confirmed via the list/retrieve endpoints.
   * This suggests the endpoint is not properly implemented on Iyzico's side.
   *
   * **Recommended alternatives:**
   * 1. Update the plan status to inactive using `update()` method
   * 2. Contact Iyzico support to report the issue
   * 3. Handle the deletion state in your application layer
   *
   * @param pricingPlanReferenceCode - The pricing plan reference code to delete
   * @returns Promise resolving to the deletion response
   * @throws {IyzicoApiError} Will throw with 404 status and errorCode "1" indicating business constraint
   * @see https://github.com/kaanmertkoc/iyzico-subscription-ts/issues - Report issues here
   */
  async delete(
    pricingPlanReferenceCode: string
  ): Promise<DeletePaymentPlanResponse> {
    // Log warning about endpoint issues
    if (this.client.getConfig().debug) {
      console.warn(
        '⚠️  [IyzicoSDK] Warning: The DELETE /pricing-plans endpoint is known to be non-functional.',
        '\n   Iyzico returns 404 with errorCode "1" even for existing plans.',
        '\n   Consider using update() to mark plans as inactive instead.',
        '\n   See: https://github.com/kaanmertkoc/iyzico-subscription-ts#known-issues'
      );
    }

    return this.client.request<DeletePaymentPlanResponse>({
      path: `/v2/subscription/pricing-plans/${pricingPlanReferenceCode}`,
      method: 'DELETE',
    });
  }

  /**
   * Retrieves a specific payment plan by its reference code
   * @param pricingPlanReferenceCode - The pricing plan reference code to retrieve
   * @returns Promise resolving to the payment plan data
   */
  async retrieve(
    pricingPlanReferenceCode: string
  ): Promise<GetPaymentPlanResponse> {
    return this.client.request<GetPaymentPlanResponse>({
      path: `/v2/subscription/pricing-plans/${pricingPlanReferenceCode}`,
      method: 'GET',
    });
  }

  /**
   * Lists all payment plans for a product with pagination
   * @param productReferenceCode - The product reference code to list plans for
   * @param page - Page number (optional, defaults to 1)
   * @param count - Items per page (optional, defaults to 10)
   * @returns Promise resolving to the paginated list of payment plans
   */
  async list(
    productReferenceCode: string,
    page: number = 1,
    count: number = 10
  ): Promise<ListPaymentPlansResponse> {
    return this.client.request<ListPaymentPlansResponse>({
      path: `/v2/subscription/products/${productReferenceCode}/pricing-plans?page=${page}&count=${count}`,
      method: 'GET',
    });
  }
}
