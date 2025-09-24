import { Hono } from 'hono';
import { iyzico } from '../../lib/iyzico';
import { validator, Schemas } from '../../lib/validation-utils';
import { errorHandler, success } from '../../lib/error-handler';

const healthRoutes = new Hono();

// Simple test route to verify routing works
healthRoutes.get('/test', async (c) => {
  console.log('[HEALTH] Test route hit');
  return c.json({ status: 'Health routes are working!', timestamp: Date.now() });
});

// Apply error handling middleware
healthRoutes.use('*', errorHandler.middleware());

healthRoutes.get('/bin', validator('query', Schemas.Query.bin), async (c) => {
  console.log('[HEALTH] Route hit - starting BIN check');
  const { bin } = c.req.valid('query');
  console.log('[HEALTH] Validated BIN:', bin);

  try {
    console.log('[HEALTH] Calling iyzico.health.checkBin...');
    const result = await iyzico.health.checkBin({
      binNumber: bin,
      conversationId: `bin-check-${Date.now()}`,
    });
    console.log('[HEALTH] BIN check result:', result);
    
    return c.json(success(result));
  } catch (error) {
    console.error('[HEALTH] Error in BIN check:', error);
    throw error; // Re-throw to let error handler deal with it
  }
});

export default healthRoutes;
