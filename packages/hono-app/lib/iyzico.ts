import { IyzicoClient } from '@kaanmertkoc/iyzico-ts';

// Production credentials (required)
const apiKey = process.env.IYZICO_API_KEY;
const secretKey = process.env.IYZICO_SECRET_KEY;

// Sandbox credentials (optional, only required if using sandbox mode)
const sandboxApiKey = process.env.IYZICO_SANDBOX_API_KEY;
const sandboxSecretKey = process.env.IYZICO_SANDBOX_SECRET_KEY;

// Environment mode (defaults to production)
const isSandbox = process.env.IYZICO_ENVIRONMENT === 'sandbox';

if (!apiKey || !secretKey) {
  throw new Error('Missing IYZICO_API_KEY or IYZICO_SECRET_KEY in environment');
}

export const iyzico = new IyzicoClient({
  apiKey,
  secretKey,
  sandboxApiKey,
  sandboxSecretKey,
  isSandbox,
  debug: process.env.NODE_ENV === 'development', // Enable debug in development
});
