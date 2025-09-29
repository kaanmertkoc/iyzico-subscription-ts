# @kaanmertkoc/iyzico-subs-ts

> Modern TypeScript SDK for Iyzico Subscription API - Cross-platform compatible

[![npm version](https://img.shields.io/npm/v/@kaanmertkoc/iyzico-subs-ts.svg)](https://www.npmjs.com/package/@kaanmertkoc/iyzico-subs-ts)
[![TypeScript](https://img.shields.io/badge/%3C%2F%3E-TypeScript-%230074c1.svg)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-18%2B-green.svg)](https://nodejs.org)

A lightweight, fully-typed, cross-platform SDK for Iyzico's subscription API. **Works everywhere** - Node.js, Bun, browsers, serverless functions, and edge runtimes.

## 🚀 Features

- ✅ **Full TypeScript support** with comprehensive type definitions
- ✅ **Cross-platform compatible** - Node.js 18+, Bun, Deno, browsers, serverless
- ✅ **Zero dependencies** - uses only standard web APIs (`fetch`, `crypto`)
- ✅ **Subscription-focused** - specifically designed for Iyzico's subscription routes
- ✅ **Modern ESM/CJS** - ships with both module formats
- ✅ **Comprehensive error handling** - structured errors with user-friendly messages
- ✅ **Built-in authentication** - automatic HMAC-SHA256 signature generation
- ✅ **Production ready** - used in production applications

## 📦 Installation

```bash
npm install @kaanmertkoc/iyzico-subs-ts
# or
yarn add @kaanmertkoc/iyzico-subs-ts
# or
bun add @kaanmertkoc/iyzico-subs-ts
```

## 🔑 Quick Start

### Basic Usage (Node.js)

```typescript
import { IyzicoClient } from '@kaanmertkoc/iyzico-subs-ts';

const iyzico = new IyzicoClient({
  apiKey: process.env.IYZICO_API_KEY!,
  secretKey: process.env.IYZICO_SECRET_KEY!,
  isSandbox: process.env.NODE_ENV !== 'production'
});

// Create a subscription product
const product = await iyzico.products.create({
  name: 'Premium Subscription',
  description: 'Monthly premium plan'
});

// Create a pricing plan
const plan = await iyzico.plans.create({
  productReferenceCode: product.data.referenceCode,
  name: 'Monthly Plan',
  price: '29.99',
  paymentInterval: 'MONTHLY',
  paymentIntervalCount: 1,
  currencyCode: 'TRY'
});

// Create subscription
const subscription = await iyzico.subscriptions.create({
  locale: 'tr',
  customer: {
    name: 'John',
    surname: 'Doe',
    email: 'john@example.com',
    identityNumber: '11111111111',
    billingAddress: {
      contactName: 'John Doe',
      country: 'Turkey',
      city: 'Istanbul',
      address: 'Example Address'
    }
  },
  paymentCard: {
    cardHolderName: 'John Doe',
    cardNumber: '5528790000000008',
    expireMonth: '12',
    expireYear: '2030',
    cvc: '123'
  },
  pricingPlanReferenceCode: plan.data.referenceCode
});
```

### Environment Variables

Create a `.env` file:

```env
# Production credentials
IYZICO_API_KEY=your_production_api_key
IYZICO_SECRET_KEY=your_production_secret_key

# Sandbox credentials (optional, only if using sandbox)
IYZICO_SANDBOX_API_KEY=your_sandbox_api_key
IYZICO_SANDBOX_SECRET_KEY=your_sandbox_secret_key

# Environment
NODE_ENV=development
```

## 🏗️ API Reference

### Core Services

The SDK provides dedicated services for each API domain:

```typescript
// Products - Manage subscription products
iyzico.products.create(data)    // Create product
iyzico.products.list()          // List products  
iyzico.products.retrieve(id)    // Get specific product
iyzico.products.update(id, data) // Update product
iyzico.products.delete(id)      // Delete product

// Plans - Manage pricing plans
iyzico.plans.create(data)       // Create plan
iyzico.plans.list()             // List plans
iyzico.plans.retrieve(id)       // Get specific plan  
iyzico.plans.update(id, data)   // Update plan
iyzico.plans.delete(id)         // Delete plan

// Subscriptions - Manage customer subscriptions
iyzico.subscriptions.create(data)     // Create subscription
iyzico.subscriptions.list()           // List subscriptions
iyzico.subscriptions.retrieve(id)     // Get specific subscription
iyzico.subscriptions.upgrade(id, data) // Upgrade subscription
iyzico.subscriptions.cancel(id)       // Cancel subscription

// Checkout - Create checkout forms  
iyzico.checkout.create(data)    // Create checkout form
iyzico.checkout.retrieve(id)    // Get checkout result

// Health - Utility methods
iyzico.health.check()           // API health check
iyzico.health.binCheck(binNumber) // Card BIN validation
```

### Configuration Options

```typescript
new IyzicoClient({
  // Required: Your API credentials
  apiKey: string;
  secretKey: string;
  
  // Optional: Sandbox credentials (only needed if isSandbox: true)
  sandboxApiKey?: string;
  sandboxSecretKey?: string;
  
  // Optional: Environment settings
  isSandbox?: boolean;          // Use sandbox API (default: false)
  baseUrl?: string;             // Custom API base URL
  timeout?: number;             // Request timeout in ms (default: 30000)
  maxRetries?: number;          // Max retry attempts (default: 3)
  debug?: boolean;              // Enable debug logging (default: false)
  
  // Optional: Custom headers
  userAgent?: string;           // Custom user agent
  defaultHeaders?: Record<string, string>; // Additional headers
});
```

## 🌐 Cross-Platform Usage

The SDK works seamlessly across all modern JavaScript environments:

### Next.js API Route
```typescript
// pages/api/subscriptions.ts
import { IyzicoClient } from '@kaanmertkoc/iyzico-subs-ts';

const iyzico = new IyzicoClient({
  apiKey: process.env.IYZICO_API_KEY!,
  secretKey: process.env.IYZICO_SECRET_KEY!,
  isSandbox: process.env.NODE_ENV !== 'production'
});

export default async function handler(req, res) {
  const subscription = await iyzico.subscriptions.create(req.body);
  res.json(subscription);
}
```

### Cloudflare Worker
```typescript
import { IyzicoClient } from '@kaanmertkoc/iyzico-subs-ts';

export default {
  async fetch(request, env) {
    const iyzico = new IyzicoClient({
      apiKey: env.IYZICO_API_KEY,
      secretKey: env.IYZICO_SECRET_KEY,
      isSandbox: env.ENVIRONMENT !== 'production'
    });
    
    const subscriptions = await iyzico.subscriptions.list();
    return Response.json(subscriptions);
  }
};
```

### Vercel Edge Function
```typescript
import { IyzicoClient } from '@kaanmertkoc/iyzico-subs-ts';

export const config = { runtime: 'edge' };

export default async function handler(request) {
  const iyzico = new IyzicoClient({
    apiKey: process.env.IYZICO_API_KEY!,
    secretKey: process.env.IYZICO_SECRET_KEY!,
    isSandbox: true
  });
  
  const result = await iyzico.health.check();
  return Response.json(result);
}
```

## ⚡ Error Handling

The SDK provides structured error handling with user-friendly messages:

```typescript
import { IyzicoClient, IyzicoApiError, IyzicoNetworkError } from '@kaanmertkoc/iyzico-subs-ts';

try {
  const subscription = await iyzico.subscriptions.create(data);
} catch (error) {
  if (error instanceof IyzicoApiError) {
    console.error('API Error:', {
      statusCode: error.statusCode,
      message: error.message,
      userFriendlyMessage: error.getUserFriendlyMessage(),
      errorCode: error.errorCode,
      category: error.getCategory(),
      isRetryable: error.isRetryable()
    });
  } else if (error instanceof IyzicoNetworkError) {
    console.error('Network Error:', {
      message: error.message,
      isTimeout: error.isTimeout
    });
  }
}
```

## 🛠️ Development

### Local Development

```bash
# Clone the repository
git clone <your-repo-url>
cd iyzico-bun-starter

# Install dependencies
npm install

# Build the SDK
npm run build

# Run tests
npm test

# Start example app
npm run dev
```

### Testing

```bash
# Run all tests
npm test

# Run tests with coverage
npm run test:coverage

# Type checking
npm run typecheck
```

## 📚 Documentation

For detailed usage examples across different platforms, refer to the cross-platform usage examples included in this README.

## 🔒 Security

- **Never expose secret keys** in client-side code
- Use environment variables for API credentials
- The SDK automatically handles HMAC-SHA256 authentication
- All requests are made over HTTPS

## 🤝 Contributing

Contributions are welcome! Please refer to the codebase for detailed information about the project architecture and development workflow.

## 📄 License

[MIT License](./LICENSE)

---

**Note**: This SDK is specifically designed for Iyzico's **subscription API routes**. For other Iyzico APIs (payments, marketplace, etc.), please refer to the official Iyzico documentation.
