import type { IyzicoClient } from '../client';
import type {
  InitializeCheckoutRequest,
  InitializeSubscriptionRequest,
  CheckoutFormResponse,
  InitializeSubscriptionResponse,
  SubscriptionInitData,
  CardUpdateRequest,
  BaseResponse,
} from '../types';

/**
 * Service for managing checkout forms in the Iyzico subscription system
 */
export class CheckoutService {
  /**
   * Client reference ID can be used to store the client reference ID in easy way for handling callbacks
   * @private
   */
  private client_reference_id: undefined | string = undefined;

  constructor(private client: IyzicoClient) {}

  /**
   * Initializes a checkout form for subscription payments
   * @param params - Checkout initialization parameters
   * @returns Promise resolving to the checkout form data
   */
  async initialize(
    params: InitializeCheckoutRequest
  ): Promise<CheckoutFormResponse> {
    this.client_reference_id = params.clientReferenceId || undefined;
    // Transform the customer data to match Iyzico's expected format
    const customer = {
      name: params.name,
      surname: params.surname,
      email: params.email,
      gsmNumber: params.gsmNumber?.startsWith('+90')
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

    const response = await this.client.request<CheckoutFormResponse>({
      path: '/v2/subscription/checkoutform/initialize',
      method: 'POST',
      body: requestBody,
    });

    if (this.client_reference_id) {
      return {
        ...response,
        clientReferenceId: this.client_reference_id,
      };
    }
    return response;
  }

  /**
   * Initializes a subscription via NON-3DS with payment card
   * @param params - Subscription initialization parameters with card info
   * @returns Promise resolving to the subscription data
   */
  async initializeSubscription(
    params: InitializeSubscriptionRequest
  ): Promise<InitializeSubscriptionResponse> {
    this.client_reference_id = params.clientReferenceId || undefined;
    // Transform the customer data to match Iyzico's expected format
    const customer = {
      name: params.name,
      surname: params.surname,
      email: params.email,
      gsmNumber: params.gsmNumber?.startsWith('+90')
        ? params.gsmNumber
        : `+90${params.gsmNumber}`,
      identityNumber: params.identityNumber,
      billingAddress: params.billingAddress,
      shippingAddress: params.shippingAddress,
    };

    const requestBody = {
      locale: params.locale || 'tr',
      conversationId: params.conversationId || `subscription-${Date.now()}`,
      pricingPlanReferenceCode: params.pricingPlanReferenceCode,
      subscriptionInitialStatus: params.subscriptionInitialStatus || 'ACTIVE',
      customer,
      paymentCard: params.paymentCard,
    };

    const response = await this.client.request<InitializeSubscriptionResponse>({
      path: '/v2/subscription/initialize',
      method: 'POST',
      body: requestBody,
    });

    if (this.client_reference_id) {
      return {
        ...response,
        clientReferenceId: this.client_reference_id,
      };
    }
    return response;
  }

  /**
   * Retrieves checkout form result using the token
   * @param token - The checkout form token received from the callback
   * @returns Promise resolving to the checkout form result data
   */
  async retrieve(token: string): Promise<BaseResponse<SubscriptionInitData> & { clientReferenceId?: string }> {
    const response = await this.client.request<BaseResponse<SubscriptionInitData>>({
      path: `/v2/subscription/checkoutform/${token}`,
      method: 'POST',
      body: {
        conversationId: `checkout-retrieve-${Date.now()}`,
        token,
      },
    });

    if (this.client_reference_id) {
      return {
        ...response,
        clientReferenceId: this.client_reference_id,
      };
    }
    return response;
  }

  /**
   * Initializes a card update checkout form
   * @param params - Card update parameters (requires either subscriptionReferenceCode or customerReferenceCode)
   * @returns Promise resolving to the card update checkout form data
   */
  async initializeCardUpdate(
    params: CardUpdateRequest
  ): Promise<CheckoutFormResponse> {
    const requestBody: Record<string, unknown> = {
      locale: params.locale || 'tr',
      conversationId: params.conversationId || `card-update-${Date.now()}`,
      callbackUrl: params.callbackUrl,
    };

    if (params.subscriptionReferenceCode) {
      requestBody.subscriptionReferenceCode = params.subscriptionReferenceCode;
    }
    if (params.customerReferenceCode) {
      requestBody.customerReferenceCode = params.customerReferenceCode;
    }

    return this.client.request<CheckoutFormResponse>({
      path: '/v2/subscription/card-update/checkoutform/initialize',
      method: 'POST',
      body: requestBody,
    });
  }
}
