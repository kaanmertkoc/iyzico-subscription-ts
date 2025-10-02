import { Hono } from 'hono';
import { iyzico } from '../../lib/iyzico';
import { validator, Schemas } from '../../lib/validation-utils';
import { errorHandler, success } from '../../lib/error-handler';
import type {
  InitializeCheckoutRequest,
  InitializeSubscriptionRequest,
  CardUpdateRequest,
} from '@kaanmertkoc/iyzico-subs-ts';

const checkoutRoutes = new Hono();

checkoutRoutes.use('*', errorHandler.middleware());

// Initialize Checkout Form
checkoutRoutes.post(
  '/',
  validator('json', Schemas.InitializeCheckout),
  async (c) => {
    const checkoutData = c.req.valid('json') as InitializeCheckoutRequest;
    const result = await iyzico.checkout.initialize(checkoutData);
    return c.json(success(result));
  }
);

// Initialize Subscription via NON-3DS
checkoutRoutes.post(
  '/subscription',
  validator('json', Schemas.InitializeSubscription),
  async (c) => {
    const subscriptionData = c.req.valid('json') as InitializeSubscriptionRequest;
    const result = await iyzico.checkout.initializeSubscription(subscriptionData);
    return c.json(success(result));
  }
);

// Retrieve Checkout Form Result
checkoutRoutes.get(
  '/:token',
  validator('param', Schemas.Params.token),
  async (c) => {
    const { token } = c.req.valid('param');
    const result = await iyzico.checkout.retrieve(token);
    return c.json(success(result));
  }
);

// Initialize Card Update
checkoutRoutes.post(
  '/card-update',
  validator('json', Schemas.CardUpdate),
  async (c) => {
    const cardUpdateData = c.req.valid('json') as CardUpdateRequest;
    const result = await iyzico.checkout.initializeCardUpdate(cardUpdateData);
    return c.json(success(result));
  }
);

export default checkoutRoutes;