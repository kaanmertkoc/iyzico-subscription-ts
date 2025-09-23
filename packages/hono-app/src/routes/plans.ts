import { Hono } from 'hono';
import { iyzico } from '../../lib/iyzico';
import {
  validator,
  CreatePaymentPlanRequestSchema,
  PlanParamsSchema,
  type CreatePaymentPlanRequest,
} from '../../lib/validation-utils';

const plansRoutes = new Hono();

// CREATE Payment Plan - Using your exact SDK CreatePaymentPlanRequest type!
plansRoutes.post('/', validator('json', CreatePaymentPlanRequestSchema), async (c) => {
  try {
    const planData = c.req.valid('json') as CreatePaymentPlanRequest;
    const result = await iyzico.plans.create(planData);
    return c.json(result, 201);
  } catch (error) {
    console.error('Plan creation error:', error);
    return c.json(
      { error: 'Failed to create plan', timestamp: Date.now() },
      500
    );
  }
});

// READ Payment Plan
plansRoutes.get(
  '/:id',
  validator('param', PlanParamsSchema),
  async (c) => {
    try {
      const { id } = c.req.valid('param');
      const result = await iyzico.plans.retrieve(id);
      return c.json(result);
    } catch (error) {
      console.error('Plan retrieval error:', error);
      return c.json({ error: 'Plan not found', timestamp: Date.now() }, 404);
    }
  }
);

export default plansRoutes;
