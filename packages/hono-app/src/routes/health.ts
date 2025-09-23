import { Hono } from 'hono';
import { z } from 'zod';
import { iyzico } from '../../lib/iyzico';
import { validator, V } from '../../lib/validation-utils';

const healthRoutes = new Hono();

const BinQuerySchema = z.object({ bin: V.binNumber });

healthRoutes.get('/bin', validator('query', BinQuerySchema), async (c) => {
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
