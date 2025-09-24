import { Hono } from 'hono';
import { iyzico } from '../../lib/iyzico';
import { validator, Schemas } from '../../lib/validation-utils';
import { errorHandler, success } from '../../lib/error-handler';
import type { CreateProductRequest } from '@kaanmertkoc/iyzico-ts';

const productsRoutes = new Hono();

// Apply error handling middleware
productsRoutes.use('*', errorHandler.middleware());

// CREATE Product - Using your exact SDK CreateProductRequest type!
productsRoutes.post(
  '/',
  validator('json', Schemas.CreateProduct),
  async (c) => {
    const productData = c.req.valid('json') as CreateProductRequest;
    const result = await iyzico.products.create(productData);
    return c.json(success(result), 201);
  }
);

// READ Product
productsRoutes.get('/:id', validator('param', Schemas.Params.id), async (c) => {
  const { id } = c.req.valid('param');
  const result = await iyzico.products.retrieve(id);
  return c.json(success(result));
});

export default productsRoutes;
