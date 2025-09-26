import healthRoutes from './health';
import productsRoutes from './products';
import plansRoutes from './plans';
import subscriptionsRoutes from './subscriptions';
import { Hono } from 'hono';

const baseRoutes = new Hono();

baseRoutes.route('/health', healthRoutes);
baseRoutes.route('/products', productsRoutes);
baseRoutes.route('/plans', plansRoutes);
baseRoutes.route('/subscriptions', subscriptionsRoutes);

export default baseRoutes;
