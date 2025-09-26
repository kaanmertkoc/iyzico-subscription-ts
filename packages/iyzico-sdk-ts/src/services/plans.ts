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
   * @param pricingPlanReferenceCode - The pricing plan reference code to delete
   * @returns Promise resolving to the deletion response
   */
  async delete(
    pricingPlanReferenceCode: string
  ): Promise<DeletePaymentPlanResponse> {
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
