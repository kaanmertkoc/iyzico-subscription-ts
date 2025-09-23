import { Hono } from 'hono';
import { iyzico } from '../../lib/iyzico';
import { validator, Schemas } from '../../lib/validation-utils';
import type { CreateProductRequest } from '@kaanmertkoc/iyzico-ts';

const productsRoutes = new Hono();

// CREATE Product - Using your exact SDK CreateProductRequest type!
productsRoutes.post(
  '/',
  validator('json', Schemas.CreateProduct),
  async (c) => {
    try {
      const productData = c.req.valid('json') as CreateProductRequest;
      const result = await iyzico.products.create(productData);
      return c.json(result, 201);
    } catch (error) {
      console.error('Product creation error:', error);
      return c.json(
        { error: 'Failed to create product', timestamp: Date.now() },
        500
      );
    }
  }
);

// READ Product
productsRoutes.get('/:id', validator('param', Schemas.Params.id), async (c) => {
  try {
    const { id } = c.req.valid('param');
    // Note: Adjust this call based on your actual SDK method
    const result = await iyzico.products.retrieve(id);
    return c.json(result);
  } catch (error) {
    console.error('Product retrieval error:', error);
    return c.json({ error: 'Product not found', timestamp: Date.now() }, 404);
  }
});

export default productsRoutes;
