import { Hono } from 'hono';
import { iyzico } from '../../lib/iyzico';
import { validator, Schemas } from '../../lib/validation-utils';
import { errorHandler, success } from '../../lib/error-handler';
import type {
  CreatePaymentPlanRequest,
  UpdatePaymentPlanRequest,
} from '@kaanmertkoc/iyzico-ts';

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

// LIST Payment Plans
plansRoutes.get(
  '/',
  validator('query', Schemas.ListPaymentPlans),
  async (c) => {
    const { productReferenceCode, page, count } = c.req.valid('query');
    const result = await iyzico.plans.list(productReferenceCode, page, count);
    return c.json(success(result));
  }
);

// UPDATE Payment Plan
plansRoutes.put(
  '/:id',
  validator('param', Schemas.Params.id),
  validator('json', Schemas.UpdatePaymentPlan),
  async (c) => {
    const { id } = c.req.valid('param');
    const planData = c.req.valid('json') as UpdatePaymentPlanRequest;
    const result = await iyzico.plans.update(id, planData);
    return c.json(success(result));
  }
);

// DELETE Payment Plan
plansRoutes.delete('/:id', validator('param', Schemas.Params.id), async (c) => {
  const { id } = c.req.valid('param');
  const result = await iyzico.plans.delete(id);
  return c.json(success(result));
});

export default plansRoutes;
