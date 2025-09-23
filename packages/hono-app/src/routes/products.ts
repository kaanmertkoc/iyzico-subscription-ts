import { Hono } from 'hono';
import { z } from 'zod';
import { iyzico } from '../../lib/iyzico';
import { validator, V } from '../../lib/validation-utils';

const productsRoutes = new Hono();

const CreateProductSchema = z.object({
  name: V.productName,
  description: V.description,
});

const ProductParamsSchema = z.object({ id: V.id });

// CREATE Product
productsRoutes.post('/', validator('json', CreateProductSchema), async (c) => {
  try {
    const { name, description } = c.req.valid('json');
    const result = await iyzico.products.create({
      name,
      ...(description && { description }),
      conversationId: `product-create-${Date.now()}`,
    });
    return c.json(result, 201);
  } catch (error) {
    console.error('Product creation error:', error);
    return c.json(
      { error: 'Failed to create product', timestamp: Date.now() },
      500
    );
  }
});

// READ Product
productsRoutes.get(
  '/:id',
  validator('param', ProductParamsSchema),
  async (c) => {
    try {
      const { id } = c.req.valid('param');
      // Note: Adjust this call based on your actual SDK method
      const result = await iyzico.products.retrieve(id);
      return c.json(result);
    } catch (error) {
      console.error('Product retrieval error:', error);
      return c.json({ error: 'Product not found', timestamp: Date.now() }, 404);
    }
  }
);

export default productsRoutes;
