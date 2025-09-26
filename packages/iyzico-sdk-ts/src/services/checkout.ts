import type { IyzicoClient } from '../client';
import type {
  InitializeCheckoutRequest,
  CheckoutFormResponse,
  CheckoutFormData,
  BaseResponse,
} from '../types';

/**
 * Service for managing checkout forms in the Iyzico subscription system
 */
export class CheckoutService {
  constructor(private client: IyzicoClient) {}

  /**
   * Initializes a checkout form for subscription payments
   * @param params - Checkout initialization parameters
   * @returns Promise resolving to the checkout form data
   */
  async initialize(
    params: InitializeCheckoutRequest
  ): Promise<CheckoutFormResponse> {
    // Transform the customer data to match Iyzico's expected format
    const customer = {
      name: params.name,
      surname: params.surname,
      email: params.email,
      gsmNumber: params.gsmNumber.startsWith('+90')
        ? params.gsmNumber
        : `+90${params.gsmNumber}`,
      identityNumber: params.identityNumber,
      billingAddress: params.billingAddress,
      shippingAddress: params.shippingAddress,
    };

    const requestBody = {
      locale: params.locale || 'tr',
      conversationId: params.conversationId || `checkout-${Date.now()}`,
      pricingPlanReferenceCode: params.pricingPlanReferenceCode,
      subscriptionInitialStatus: params.subscriptionInitialStatus || 'PENDING',
      callbackUrl: params.callbackUrl,
      customer,
    };

    return this.client.request<CheckoutFormResponse>({
      path: '/v2/subscription/checkoutform/initialize',
      method: 'POST',
      body: requestBody,
    });
  }

  /**
   * Retrieves checkout form result using the token
   * @param token - The checkout form token received from the callback
   * @returns Promise resolving to the checkout form result data
   */
  async retrieve(token: string): Promise<BaseResponse<CheckoutFormData>> {
    return this.client.request<BaseResponse<CheckoutFormData>>({
      path: `/v2/subscription/checkoutform/${token}`,
      method: 'POST',
      body: {
        conversationId: `checkout-retrieve-${Date.now()}`,
        token,
      },
    });
  }
}
