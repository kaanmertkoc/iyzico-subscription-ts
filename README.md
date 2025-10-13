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

### Environment Variables

Create a `.env` file:

```env
# Production credentials
IYZICO_API_KEY=your_production_api_key
IYZICO_SECRET_KEY=your_production_secret_key
IYZICO_ENVIRONMENT=production # production or sandbox  (default: production because of sandbox limitations)


# Sandbox credentials (optional, only if using sandbox)
IYZICO_SANDBOX_API_KEY=your_sandbox_api_key
IYZICO_SANDBOX_SECRET_KEY=your_sandbox_secret_key

# Environment
NODE_ENV=development
```

## 🔑 Quick Start

```typescript
import { IyzicoClient } from '@kaanmertkoc/iyzico-subs-ts';

const iyzico = new IyzicoClient({
  apiKey: process.env.IYZICO_API_KEY!,
  secretKey: process.env.IYZICO_SECRET_KEY!,
  isSandbox: false, // Use production for subscription features
});

// 1. Create a product
const product = await iyzico.products.create({
  name: 'Premium Subscription',
  description: 'Monthly premium plan'
});

// 2. Create a pricing plan
const plan = await iyzico.plans.create({
  productReferenceCode: product.data.referenceCode,
  name: 'Monthly Plan',
  price: '29.99',
  paymentInterval: 'MONTHLY',
  paymentIntervalCount: 1,
  currencyCode: 'TRY',
  planPaymentType: 'RECURRING'
});

// 3. Initialize checkout (3DS)
const checkout = await iyzico.checkout.initialize({
  pricingPlanReferenceCode: plan.data.referenceCode,
  callbackUrl: 'https://yourdomain.com/callback',
  clientReferenceId: 'order_12345', // Track this checkout
  name: 'John',
  surname: 'Doe',
  email: 'john@example.com',
  gsmNumber: '+905551234567',
  identityNumber: '11111111111',
  billingAddress: {
    contactName: 'John Doe',
    country: 'Turkey',
    city: 'Istanbul',
    address: 'Example Address 123'
  },
  shippingAddress: {
    contactName: 'John Doe',
    country: 'Turkey',
    city: 'Istanbul',
    address: 'Example Address 123'
  }
});

// 4. Display checkout form
const formHtml = checkout.data.checkoutFormContent;

// 5. Handle callback - retrieve result
const result = await iyzico.checkout.retrieve(tokenFromCallback);
if (result.status === 'success') {
  const subscription = result.data;
  // Activate the subscription
  await iyzico.subscriptions.activate(subscription.referenceCode);
}
```

## 📚 Documentation

See the [complete API documentation](https://iyzico-docs.kaanmertkoc.com) for detailed information on all available methods and parameters.

- **📖 Interactive Docs**: [iyzico-docs.kaanmertkoc.com](https://iyzico-docs.kaanmertkoc.com)
- **📄 OpenAPI Spec**: [View on GitHub](https://github.com/kaanmertkoc/iyzico-subscription-ts/blob/main/openapi/openapi.yaml)

### Configuration Options

```typescript
const iyzico = new IyzicoClient({
  apiKey: string;              // Required
  secretKey: string;           // Required
  isSandbox?: boolean;         // Use sandbox (default: false)
  debug?: boolean;             // Enable debug logs (default: false)
  timeout?: number;            // Request timeout in ms (default: 30000)
  maxRetries?: number;         // Retry attempts (default: 3)
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
  isSandbox: process.env.NODE_ENV !== 'production',
  debug: process.env.NODE_ENV === 'development'
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

## 🐛 Known Issues

### 1. Plans UPDATE Endpoint - Limited Fields

**Limitation**: The UPDATE endpoint for pricing plans only allows updating **`name`** and **`trialPeriodDays`** fields.

**Official Statement** (from Iyzico docs):
> "Bu metod sadece name ve trialPeriodDays parametrelerinin güncellenmesine izin verir."
> (This method only allows updating the name and trialPeriodDays parameters.)

**Fields That Cannot Be Updated:**
- ❌ `status` - Cannot change to INACTIVE via API
- ❌ `paymentInterval` - Cannot be modified after creation  
- ❌ `price` - Cannot be changed after creation
- ❌ `currencyCode` - Cannot be changed after creation
- ❌ `recurrenceCount` - Cannot be changed after creation
- ❌ `planPaymentType` - Cannot be changed after creation

**Evidence:**
```typescript
// Attempt to update status - silently ignored
await iyzico.plans.update('plan-123', { 
  status: 'INACTIVE',
  name: 'Updated Name'
});
// Result: Only name is updated, status remains ACTIVE

// Attempt to update paymentInterval - silently ignored  
await iyzico.plans.update('plan-123', {
  paymentInterval: 'YEARLY',
  name: 'Updated Name'
});
// Result: Only name is updated, paymentInterval remains unchanged
```

**Workarounds:**
1. **For status changes**: Manage plan availability in your application layer
2. **For price changes**: Create a new plan with the new price
3. **For interval changes**: Create a new plan with the new interval
4. **Migration**: Update existing subscriptions to use the new plan

**SDK Behavior:**
- The SDK accepts all update parameters for flexibility
- Only `name` and `trialPeriodDays` will actually be updated by Iyzico
- Other fields are sent but silently ignored by the API
- No error is returned for ignored fields

---

### 2. Plans DELETE Endpoint Non-Functional

**Critical Issue**: The DELETE endpoint for pricing plans (`DELETE /v2/subscription/pricing-plans/{id}`) appears to be **not implemented** on Iyzico's API.

**Symptoms:**
- Returns `404` status code with `errorCode: "1"` (System error)
- Error message: "Sistem hatası" (System error)
- Occurs even when the plan **exists** (confirmed via GET/LIST endpoints)

**Evidence:**
```typescript
// Plan exists - confirmed via list
const plans = await iyzico.plans.list(productId);
// Returns: [{ referenceCode: 'abc-123', status: 'ACTIVE', ... }]

// Attempt to delete returns error
await iyzico.plans.delete('abc-123');
// Throws: IyzicoApiError with statusCode 404, errorCode "1"
```

**Workarounds:**
1. **Recommended**: Update plan status to inactive instead of deleting:
   ```typescript
   await iyzico.plans.update(planId, { 
     /* update with inactive status if supported */
   });
   ```
2. Handle deletion in your application layer (soft delete)
3. Contact Iyzico support to report the issue

**SDK Behavior:**
- The SDK correctly implements the DELETE request
- Enhanced error handling detects this as a "business constraint" error
- Debug mode logs a warning when calling this endpoint
- `error.isBusinessConstraintError()` returns `true` for this scenario

See [GitHub Issues](https://github.com/kaanmertkoc/iyzico-subscription-ts/issues) to track this issue.

---

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

The SDK provides structured error handling with user-friendly messages and helpful debugging methods:

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
      // Basic error info
      statusCode: error.statusCode,
      errorCode: error.errorCode,
      message: error.message,
      
      // User-friendly message for displaying to end users
      userFriendlyMessage: error.getUserFriendlyMessage(),
      
      // Error classification
      category: error.getCategory(), // 'authentication', 'validation', etc.
      isRetryable: error.isRetryable(),
      isClientError: error.isClientError(),
      isServerError: error.isServerError(),
      
      // Special handling for business constraints (e.g., plan deletion)
      isBusinessConstraint: error.isBusinessConstraintError(),
      contextualMessage: error.getContextualMessage('plan', 'plan-123'),
      suggestion: error.getSuggestion('delete'),
      
      // Request details for debugging
      url: error.url,
      method: error.method,
      requestId: error.requestId,
    });
  }
  // Network errors (timeout, connection issues)
  else if (error instanceof IyzicoNetworkError) {
    console.error('Network Error:', {
      message: error.message,
      isTimeout: error.isTimeout,
      requestId: error.requestId
    });
  }
}
```

### Available Error Methods

All `IyzicoApiError` instances provide these helpful methods:

| Method | Returns | Description |
|--------|---------|-------------|
| `getUserFriendlyMessage()` | `string` | Safe message to display to end users |
| `getCategory()` | `ErrorCategory` | Error category (authentication, validation, etc.) |
| `isRetryable()` | `boolean` | Whether the request should be retried |
| `isClientError()` | `boolean` | True for 4xx errors |
| `isServerError()` | `boolean` | True for 5xx errors |
| `isBusinessConstraintError()` | `boolean` | True for 404 + errorCode "1" (business rules) |
| `isNotFoundError()` | `boolean` | True for real 404s (resource doesn't exist) |
| `getContextualMessage(operation?, resourceId?)` | `string` | Operation-specific error message |
| `getSuggestion(operation?)` | `string` | Actionable suggestions for fixing the error |
| `toJSON()` | `object` | Complete error details for logging |

### Error Types

| Error Type | When It Occurs | Retryable |
|------------|----------------|----------|
| `IyzicoSandboxLimitationError` | Subscription routes in sandbox (422 + code "100001") | ❌ No - Use production |
| `IyzicoApiError` | API validation/business logic errors (4xx/5xx) | Depends on status |
| `IyzicoNetworkError` | Network issues, timeouts, DNS failures | ✅ Yes |
| `IyzicoConfigError` | Invalid SDK configuration | ❌ No - Fix configuration |

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

## 🤝 Contributing

Contributions are welcome! Please refer to the codebase for detailed information about the project architecture and development workflow.

## 📄 License

[MIT License](./LICENSE)

---

**Note**: This SDK is specifically designed for Iyzico's **subscription API routes**. For other Iyzico APIs (payments, marketplace, etc.), please refer to the official Iyzico documentation.
