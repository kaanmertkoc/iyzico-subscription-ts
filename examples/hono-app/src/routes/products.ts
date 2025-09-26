import { Hono } from 'hono';
import { iyzico } from '../../lib/iyzico';
import { validator, Schemas } from '../../lib/validation-utils';
import { errorHandler, success } from '../../lib/error-handler';
import type {
  CreateProductRequest,
  UpdateProductRequest,
} from '@kaanmertkoc/iyzico-ts';

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

// LIST Products
productsRoutes.get('/', async (c) => {
  const result = await iyzico.products.list();
  return c.json(success(result));
});

// UPDATE Product
productsRoutes.put(
  '/:id',
  validator('param', Schemas.Params.id),
  validator('json', Schemas.UpdateProduct),
  async (c) => {
    const { id } = c.req.valid('param');
    const productData = c.req.valid('json') as UpdateProductRequest;
    const result = await iyzico.products.update(id, productData);
    return c.json(success(result));
  }
);

// DELETE Product
productsRoutes.delete(
  '/:id',
  validator('param', Schemas.Params.id),
  async (c) => {
    const { id } = c.req.valid('param');
    const result = await iyzico.products.delete(id);
    return c.json(success(result));
  }
);

export default productsRoutes;
