import { Hono } from 'hono';
import { iyzico } from '../../lib/iyzico';
import { validator, Schemas } from '../../lib/validation-utils';
import { errorHandler, success } from '../../lib/error-handler';
import type { UpgradeSubscriptionRequest } from '@kaanmertkoc/iyzico-subs-ts';

const subscriptionsRoutes = new Hono();

subscriptionsRoutes.use('*', errorHandler.middleware());

// UPGRADE Subscription
subscriptionsRoutes.put(
  '/:id/upgrade',
  validator('param', Schemas.Params.id),
  validator('json', Schemas.UpgradeSubscription),
  async (c) => {
    const { id } = c.req.valid('param');
    const upgradeData = c.req.valid('json') as UpgradeSubscriptionRequest;
    const result = await iyzico.subscriptions.upgrade(id, upgradeData);
    return c.json(success(result));
  }
);

// READ Subscription
subscriptionsRoutes.get(
  '/:id',
  validator('param', Schemas.Params.id),
  async (c) => {
    const { id } = c.req.valid('param');
    const result = await iyzico.subscriptions.retrieve(id);
    return c.json(success(result));
  }
);

export default subscriptionsRoutes;
