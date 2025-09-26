import { Hono } from 'hono';
import { iyzico } from '../../lib/iyzico';
import { validator, Schemas } from '../../lib/validation-utils';
import { errorHandler, success } from '../../lib/error-handler';

const healthRoutes = new Hono();

// Apply error handling middleware
healthRoutes.use('*', errorHandler.middleware());

healthRoutes.get('/bin', validator('query', Schemas.Query.bin), async (c) => {
  const { bin } = c.req.valid('query');

  const result = await iyzico.health.checkBin({
    binNumber: bin,
    conversationId: `bin-check-${Date.now()}`,
  });

  return c.json(success(result));
});

export default healthRoutes;
