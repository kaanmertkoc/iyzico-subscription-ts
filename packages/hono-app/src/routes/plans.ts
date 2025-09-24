import { Hono } from 'hono';
import { iyzico } from '../../lib/iyzico';
import { validator, Schemas } from '../../lib/validation-utils';
import { errorHandler, success } from '../../lib/error-handler';
import type { CreatePaymentPlanRequest } from '@kaanmertkoc/iyzico-ts';

const plansRoutes = new Hono();

// Apply error handling middleware
plansRoutes.use('*', errorHandler.middleware());

// CREATE Payment Plan - Using your exact SDK CreatePaymentPlanRequest type!
plansRoutes.post(
  '/',
  validator('json', Schemas.CreatePaymentPlan),
  async (c) => {
    const planData = c.req.valid('json') as CreatePaymentPlanRequest;
    const result = await iyzico.plans.create(
      planData.productReferenceCode,
      planData
    );
    return c.json(success(result), 201);
  }
);

// READ Payment Plan
plansRoutes.get('/:id', validator('param', Schemas.Params.id), async (c) => {
  const { id } = c.req.valid('param');
  const result = await iyzico.plans.retrieve(id);
  return c.json(success(result));
});

export default plansRoutes;
