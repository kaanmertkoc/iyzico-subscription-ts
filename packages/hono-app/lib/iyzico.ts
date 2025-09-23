import { IyzicoClient } from '@kaanmertkoc/iyzico-ts';

// These should come from process.env in a real app
const apiKey = process.env.IYZICO_API_KEY;
const secretKey = process.env.IYZICO_SECRET_KEY;

if (!apiKey || !secretKey) {
  throw new Error('Missing IYZICO_API_KEY or IYZICO_SECRET_KEY in environment');
}

export const iyzico = new IyzicoClient({ apiKey, secretKey });
