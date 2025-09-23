import { Hono } from 'hono';
import { iyzico } from '../../lib/iyzico';
import { validator, Schemas } from '../../lib/validation-utils';
import type { UpgradeSubscriptionRequest } from '@kaanmertkoc/iyzico-ts';

const subscriptionsRoutes = new Hono();

// UPGRADE Subscription - Using your exact SDK UpgradeSubscriptionRequest type!
subscriptionsRoutes.put(
  '/:id/upgrade',
  validator('param', Schemas.Params.id),
  validator('json', Schemas.UpgradeSubscription),
  async (c) => {
    try {
      const { id } = c.req.valid('param');
      const upgradeData = c.req.valid('json') as UpgradeSubscriptionRequest;
      const result = await iyzico.subscriptions.upgrade(id, upgradeData);
      return c.json(result);
    } catch (error) {
      console.error('Subscription upgrade error:', error);
      return c.json(
        { error: 'Failed to upgrade subscription', timestamp: Date.now() },
        500
      );
    }
  }
);

// READ Subscription
subscriptionsRoutes.get(
  '/:id',
  validator('param', Schemas.Params.id),
  async (c) => {
    try {
      const { id } = c.req.valid('param');
      const result = await iyzico.subscriptions.retrieve(id);
      return c.json(result);
    } catch (error) {
      console.error('Subscription retrieval error:', error);
      return c.json(
        { error: 'Subscription not found', timestamp: Date.now() },
        404
      );
    }
  }
);

export default subscriptionsRoutes;
