// packages/iyzico-sdk-ts/src/auth.ts
import { createHmac } from 'node:crypto'; // Use the Node.js built-in module for universal compatibility.
import type { AuthHeaderOptions } from './types';

export function generateAuthHeaders(options: AuthHeaderOptions): HeadersInit {
  const { apiKey, secretKey, path, body } = options;
  const randomKey = `${Date.now()}${Math.floor(Math.random() * 1000000)}`;
  const payload = `${randomKey}${path}${body}`;

  // This one-liner creates the HMAC-SHA256 hash and works in both Node.js and Bun.
  const signature = createHmac('sha256', secretKey)
    .update(payload)
    .digest('hex');

  const authString = `apiKey:${apiKey}&randomKey:${randomKey}&signature:${signature}`;
  const authorization = `IYZWSv2 ${btoa(authString)}`;

  return {
    Authorization: authorization,
    'x-iyzi-rnd': randomKey,
    'Content-Type': 'application/json',
    Accept: 'application/json',
  };
}