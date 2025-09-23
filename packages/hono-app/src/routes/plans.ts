import { Hono } from 'hono';
import { iyzico } from '../../lib/iyzico';
import { validator, Schemas } from '../../lib/validation-utils';
import type { CreatePaymentPlanRequest } from '@kaanmertkoc/iyzico-ts';

const plansRoutes = new Hono();

// CREATE Payment Plan - Using your exact SDK CreatePaymentPlanRequest type!
plansRoutes.post(
  '/',
  validator('json', Schemas.CreatePaymentPlan),
  async (c) => {
    try {
      const planData = c.req.valid('json') as CreatePaymentPlanRequest;
      const result = await iyzico.plans.create(
        planData.productReferenceCode,
        planData
      );
      return c.json(result, 201);
    } catch (error) {
      console.error('Plan creation error:', error);
      return c.json(
        { error: 'Failed to create plan', timestamp: Date.now() },
        500
      );
    }
  }
);

// READ Payment Plan
plansRoutes.get('/:id', validator('param', Schemas.Params.id), async (c) => {
  try {
    const { id } = c.req.valid('param');
    const result = await iyzico.plans.retrieve(id);
    return c.json(result);
  } catch (error) {
    console.error('Plan retrieval error:', error);
    return c.json({ error: 'Plan not found', timestamp: Date.now() }, 404);
  }
});

export default plansRoutes;
