import type { IyzicoClient } from '../client';
import type {
  UpgradeSubscriptionRequest,
  SubscriptionResponse,
  SubscriptionData,
  BaseResponse,
} from '../types';

/**
 * Service for managing subscriptions in the Iyzico subscription system
 */
export class SubscriptionsService {
  constructor(private client: IyzicoClient) {}

  /**
   * Activates a pending subscription
   * @param subscriptionReferenceCode - The subscription reference code to activate
   * @returns Promise resolving to the activation response
   */
  async activate(subscriptionReferenceCode: string): Promise<SubscriptionResponse> {
    return this.client.request<SubscriptionResponse>({
      path: `/v2/subscription/subscriptions/${subscriptionReferenceCode}/activate`,
      method: 'POST',
      body: {
        locale: 'tr',
        conversationId: `subscription-activate-${Date.now()}`,
      },
    });
  }

  /**
   * Retries a failed subscription payment
   * @param subscriptionReferenceCode - The subscription reference code to retry
   * @returns Promise resolving to the retry response
   */
  async retry(subscriptionReferenceCode: string): Promise<SubscriptionResponse> {
    return this.client.request<SubscriptionResponse>({
      path: `/v2/subscription/subscriptions/${subscriptionReferenceCode}/retry`,
      method: 'POST',
      body: {
        locale: 'tr',
        conversationId: `subscription-retry-${Date.now()}`,
      },
    });
  }

  /**
   * Upgrades a subscription to a new pricing plan
   * @param subscriptionReferenceCode - The subscription reference code to upgrade
   * @param params - Upgrade parameters
   * @returns Promise resolving to the upgrade response
   */
  async upgrade(
    subscriptionReferenceCode: string, 
    params: UpgradeSubscriptionRequest
  ): Promise<SubscriptionResponse> {
    return this.client.request<SubscriptionResponse>({
      path: `/v2/subscription/subscriptions/${subscriptionReferenceCode}/upgrade`,
      method: 'POST',
      body: { 
        locale: 'tr',
        conversationId: `subscription-upgrade-${Date.now()}`,
        useTrial: false, 
        ...params 
      },
    });
  }

  /**
   * Cancels an active subscription
   * @param subscriptionReferenceCode - The subscription reference code to cancel
   * @returns Promise resolving to the cancellation response
   */
  async cancel(subscriptionReferenceCode: string): Promise<SubscriptionResponse> {
    return this.client.request<SubscriptionResponse>({
      path: `/v2/subscription/subscriptions/${subscriptionReferenceCode}/cancel`,
      method: 'POST',
      body: { 
        locale: 'tr', 
        conversationId: `subscription-cancel-${Date.now()}`,
      },
    });
  }

  /**
   * Retrieves subscription details
   * @param subscriptionReferenceCode - The subscription reference code to retrieve
   * @returns Promise resolving to the subscription data
   */
  async retrieve(subscriptionReferenceCode: string): Promise<BaseResponse<SubscriptionData>> {
    return this.client.request<BaseResponse<SubscriptionData>>({
      path: `/v2/subscription/subscriptions/${subscriptionReferenceCode}`,
      method: 'GET',
    });
  }

  /**
   * Lists all subscriptions with optional filtering
   * @param page - Page number (optional, defaults to 1)
   * @param count - Items per page (optional, defaults to 10)
   * @returns Promise resolving to the paginated list of subscriptions
   */
  async list(page: number = 1, count: number = 10): Promise<BaseResponse<SubscriptionData[]>> {
    return this.client.request<BaseResponse<SubscriptionData[]>>({
      path: `/v2/subscription/subscriptions?page=${page}&count=${count}`,
      method: 'GET',
    });
  }
}
