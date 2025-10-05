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
bun install @kaanmertkoc/iyzico-subs-ts
# or
npm install @kaanmertkoc/iyzico-subs-ts
# or
yarn add @kaanmertkoc/iyzico-subs-ts
# or
pnpm add @kaanmertkoc/iyzico-subs-ts
# or
deno add @kaanmertkoc/iyzico-subs-ts
```

## 🔑 Quick Start

### Basic Usage (Node.js/Bun/Deno)

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

## 📚 Documentation

### Interactive API Documentation

Explore the complete API reference with interactive examples:

- **📖 Interactive Docs**: [iyzico-docs.kaanmertkoc.com](https://iyzico-docs.kaanmertkoc.com) _(Coming Soon)_
- **📄 OpenAPI Spec**: [View on GitHub](https://github.com/kaanmertkoc/iyzico-subscription-ts/blob/main/openapi/openapi.yaml)
- **⬇️ Download Spec**: [openapi.yaml](https://raw.githubusercontent.com/kaanmertkoc/iyzico-subscription-ts/main/openapi/openapi.yaml)

### Import to Your Tools

You can import the OpenAPI spec directly into your favorite API tools:

**Postman:**
```bash
# Import URL
https://raw.githubusercontent.com/kaanmertkoc/iyzico-subscription-ts/main/openapi/openapi.yaml
```

**Insomnia/Bruno/Paw:**
```bash
# Download and import
curl -O https://raw.githubusercontent.com/kaanmertkoc/iyzico-subscription-ts/main/openapi/openapi.yaml
```

**Local Preview:**
```bash
# Serve docs locally
npm run docs:serve
# Open in browser
npm run docs:open
```

For detailed usage examples across different platforms, refer to the cross-platform usage examples included in this README.

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

## ⚠️ Sandbox Limitations

**Important**: Iyzico's sandbox environment has significant limitations for subscription routes.

### What Works in Sandbox

✅ **Health Check Endpoints**
```typescript
const iyzico = new IyzicoClient({
  apiKey: 'sandbox-api-key',
  secretKey: 'sandbox-secret-key',
  isSandbox: true // Triggers automatic warning
});

// ✅ These work in sandbox
await iyzico.health.check();
await iyzico.health.binCheck('552879');
```

### What Does NOT Work in Sandbox

❌ **All Subscription Routes** (Products, Plans, Subscriptions, Checkout)

```typescript
// ❌ These will throw IyzicoSandboxLimitationError in sandbox
await iyzico.products.create(...);
await iyzico.plans.create(...);
await iyzico.subscriptions.create(...);
await iyzico.checkout.create(...);
```

### Handling Sandbox Errors

The SDK automatically detects sandbox limitations and throws a specialized error:

```typescript
import { 
  IyzicoClient, 
  IyzicoSandboxLimitationError,
  isSandboxLimitationError 
} from '@kaanmertkoc/iyzico-subs-ts';

const iyzico = new IyzicoClient({
  apiKey: process.env.IYZICO_API_KEY!,
  secretKey: process.env.IYZICO_SECRET_KEY!,
  isSandbox: true
});

try {
  await iyzico.products.create({
    name: 'Test Product',
    description: 'Test'
  });
} catch (error) {
  if (error instanceof IyzicoSandboxLimitationError) {
    console.error('⚠️  Sandbox Limitation:', error.message);
    console.error('Affected route:', error.affectedRoute);
    console.error('Suggestion:', error.getSuggestion());
    // Example: Switch to production or mock the data
  }
  
  // Alternative: Use helper function
  if (isSandboxLimitationError(error)) {
    // Handle sandbox limitation
  }
}
```

### Migration to Production

When ready for production, simply update your configuration:

```typescript
const iyzico = new IyzicoClient({
  apiKey: process.env.IYZICO_PRODUCTION_API_KEY!,
  secretKey: process.env.IYZICO_PRODUCTION_SECRET_KEY!,
  isSandbox: false // Use production environment
});

// ✅ Now all subscription routes work
await iyzico.products.create(...);
await iyzico.subscriptions.create(...);
```

### Environment-Based Configuration

Best practice for handling both environments:

```typescript
const iyzico = new IyzicoClient({
  apiKey: process.env.NODE_ENV === 'production'
    ? process.env.IYZICO_PRODUCTION_API_KEY!
    : process.env.IYZICO_SANDBOX_API_KEY!,
  secretKey: process.env.NODE_ENV === 'production'
    ? process.env.IYZICO_PRODUCTION_SECRET_KEY!
    : process.env.IYZICO_SANDBOX_SECRET_KEY!,
  isSandbox: process.env.NODE_ENV !== 'production'
});

// Check if sandbox mode is active
if (iyzico.isSandbox) {
  console.log('⚠️  Running in sandbox mode - subscription routes unavailable');
  // Use mock data or skip subscription operations
}
```

## ⚡ Error Handling

The SDK provides structured error handling with user-friendly messages:

```typescript
import { 
  IyzicoClient, 
  IyzicoApiError, 
  IyzicoNetworkError,
  IyzicoSandboxLimitationError 
} from '@kaanmertkoc/iyzico-subs-ts';

try {
  const subscription = await iyzico.subscriptions.create(data);
} catch (error) {
  // Sandbox limitation (422 with code "100001")
  if (error instanceof IyzicoSandboxLimitationError) {
    console.error('Sandbox limitation:', error.message);
    console.error('Use production credentials for this route');
  }
  // General API errors (4xx, 5xx)
  else if (error instanceof IyzicoApiError) {
    console.error('API Error:', {
      statusCode: error.statusCode,
      message: error.message,
      userFriendlyMessage: error.getUserFriendlyMessage(),
      errorCode: error.errorCode,
      category: error.getCategory(),
      isRetryable: error.isRetryable()
    });
  }
  // Network errors (timeout, connection issues)
  else if (error instanceof IyzicoNetworkError) {
    console.error('Network Error:', {
      message: error.message,
      isTimeout: error.isTimeout
    });
  }
}
```

### Error Types

| Error Type | When It Occurs | Retryable |
|------------|----------------|----------|
| `IyzicoSandboxLimitationError` | Subscription routes in sandbox (422 + code "100001") | ❌ No - Use production |
| `IyzicoApiError` | API validation/business logic errors (4xx/5xx) | Depends on status |
| `IyzicoNetworkError` | Network issues, timeouts, DNS failures | ✅ Yes |
| `IyzicoValidationError` | Invalid request parameters (400) | ❌ No - Fix request |
| `IyzicoAuthenticationError` | Invalid credentials (401) | ❌ No - Check credentials |

## 🛠️ Development

### Local Development

```bash
# Clone the repository
git clone https://github.com/kaanmertkoc/iyzico-subscription-ts
cd iyzico-subscription-ts

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
