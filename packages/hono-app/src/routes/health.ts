import { Hono } from 'hono';
import { iyzico } from '../../lib/iyzico';
import { validator, BinCheckQuerySchema } from '../../lib/validation-utils';

const healthRoutes = new Hono();

healthRoutes.get('/bin', validator('query', BinCheckQuerySchema), async (c) => {
  try {
    const { bin } = c.req.valid('query');

    const result = await iyzico.health.checkBin({
      binNumber: bin,
      conversationId: `bin-check-${Date.now()}`,
    });

    return c.json(result);
  } catch (error) {
    console.error('BIN check error:', error);
    return c.json(
      { error: 'Failed to check BIN number', timestamp: Date.now() },
      500
    );
  }
});

export default healthRoutes;
