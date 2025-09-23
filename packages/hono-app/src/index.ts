// Default Hono imports
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';

// Import routes
import baseRoutes from './routes/index';

const app = new Hono();

app.use('*', logger());

// adjust this to your needs
const allowedOrigins = ['*'];

app.use(
  '/api/*',
  cors({
    origin: (origin) => {
      // In development, allow all origins
      if (process.env.NODE_ENV !== 'production') {
        return '*';
      }

      // In production, check for matching domains including subdomains
      if (origin) {
        // Check if the origin ends with any of our allowed domains
        const isAllowed = allowedOrigins.some((domain) => {
          // This will match both base domain and any subdomain
          const pattern = new RegExp(
            `^https?:\/\/(.*\.)?${domain.replace('.', '\\.')}$`
          );
          return pattern.test(origin);
        });

        if (isAllowed) {
          return origin;
        }
      }

      // If origin doesn't match, return null (request will be blocked)
      return null;
    },
    credentials: true,
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization'],
    exposeHeaders: ['Content-Length', 'X-Requested-With'],
    maxAge: 3600,
  })
);

// Register routes
app.route('/api', baseRoutes);

// Basic health check for the app itself
app.get('/api/status', (c) => {
  return c.json({
    status: 'OK',
    timestamp: Date.now(),
    message: 'Hono app with Iyzico SDK is running',
  });
});

export default {
  port: process.env.PORT || 3001,
  fetch: app.fetch,
  handler: app.fetch,
};
