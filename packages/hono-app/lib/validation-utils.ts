import { z } from 'zod';
import { Context } from 'hono';
import { zValidator } from '@hono/zod-validator';

/**
 * Standardized validation error handler
 */
const handleValidationError = (result: any, c: Context) => {
  if (!result.success) {
    const firstError = result.error.issues[0];
    return c.json(
      {
        error: 'Validation Error',
        message: firstError?.message || 'Invalid input',
        field: firstError?.path[0]?.toString(),
        timestamp: Date.now(),
      },
      400
    );
  }
  return undefined;
};

/**
 * Clean validator creator with consistent error handling
 */
export const validator = <T extends z.ZodType>(
  target: 'query' | 'json' | 'param' | 'header',
  schema: T
) => zValidator(target, schema, handleValidationError);

/**
 * Common validation patterns
 */
export const V = {
  id: z.string().min(1, 'ID is required'),
  binNumber: z.string().length(6).regex(/^\d{6}$/, 'Must be 6 digits'),
  productName: z.string().min(1).max(255, 'Name too long'),
  description: z.string().max(1000, 'Description too long').optional(),
  conversationId: z.string().max(120).optional(),
};
