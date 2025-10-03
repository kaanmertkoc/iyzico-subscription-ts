# Hono REST API Example

A lightweight REST API example using [Hono](https://hono.dev/) framework with the `@kaanmertkoc/iyzico-subs-ts` SDK.

## 🚀 Features

- ✅ Minimal setup - get started in seconds
- ✅ RESTful API endpoints for Iyzico subscriptions
- ✅ Type-safe with TypeScript
- ✅ Works with Node.js 18+ and Bun
- ✅ Hot reload during development
- ✅ Perfect for microservices or serverless functions

## 📦 Quick Start

### 1. Install Dependencies

From this directory (`examples/hono-app`):

```bash
bun install
# or
npm install
```

### 2. Set Up Environment Variables

Copy the example environment file:

```bash
cp .env.example .env.local
```

Edit `.env.local` with your Iyzico credentials:

```env
IYZICO_API_KEY=your_api_key_here
IYZICO_SECRET_KEY=your_secret_key_here
IYZICO_IS_SANDBOX=true
PORT=3000
```

> **Get your credentials**: Sign up at [merchant.iyzipay.com](https://merchant.iyzipay.com/)

### 3. Start Development Server

```bash
bun run dev
# or
npm run dev
```

The API will be available at `http://localhost:3000`

## 📡 API Endpoints

### Health Check

```bash
GET /health
```

Response:
```json
{
  "status": "ok",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

### Create Subscription Product

```bash
POST /api/products
Content-Type: application/json

{
  "name": "Premium Plan",
  "description": "Premium subscription features"
}
```

### List Products

```bash
GET /api/products
```

### Create Pricing Plan

```bash
POST /api/plans
Content-Type: application/json

{
  "productReferenceCode": "PRODUCT_REF_CODE",
  "name": "Monthly Plan",
  "price": "29.99",
  "currencyCode": "TRY",
  "paymentInterval": "MONTHLY",
  "paymentIntervalCount": 1
}
```

### Create Subscription

```bash
POST /api/subscriptions
Content-Type: application/json

{
  "pricingPlanReferenceCode": "PLAN_REF_CODE",
  "customer": {
    "name": "John",
    "surname": "Doe",
    "email": "john@example.com",
    "identityNumber": "11111111111",
    "billingAddress": {
      "contactName": "John Doe",
      "country": "Turkey",
      "city": "Istanbul",
      "address": "Example Address"
    }
  },
  "paymentCard": {
    "cardHolderName": "John Doe",
    "cardNumber": "5528790000000008",
    "expireMonth": "12",
    "expireYear": "2030",
    "cvc": "123"
  }
}
```

## 🔧 Available Scripts

| Command | Description |
|---------|-------------|
| `bun run dev` | Start development server with hot reload |
| `bun run start` | Start production server |
| `bun run build` | Build for production |
| `bun run preview` | Preview production build |

## 📁 Project Structure

```
hono-app/
├── src/
│   ├── index.ts          # Main application entry point
│   └── routes/           # API route handlers
├── lib/
│   └── iyzico.ts        # Iyzico SDK client initialization
├── .env.example         # Environment variables template
└── package.json         # Dependencies and scripts
```

## 💳 Testing with Sandbox

Use Iyzico's test card numbers:

- **Card Number**: `5528790000000008`
- **Expiry**: `12/2030`
- **CVV**: `123`
- **Cardholder**: Any name

## 🌐 Deployment

### Deploy to Bun.sh

```bash
# Build
bun run build

# Deploy (configure your deployment)
```

### Deploy to Node.js Server

```bash
# Build
npm run build

# Start
npm run start
```

### Deploy to Vercel/Netlify

1. Set environment variables in your platform dashboard
2. Deploy the repository
3. Set start command to `bun run start` or `npm run start`

### Deploy to Docker

A Dockerfile is included in this example:

```bash
# Build the image
docker build -t hono-iyzico-api .

# Run the container
docker run -d \
  -p 3000:3000 \
  -e IYZICO_API_KEY=your_key \
  -e IYZICO_SECRET_KEY=your_secret \
  -e IYZICO_IS_SANDBOX=true \
  --name iyzico-api \
  hono-iyzico-api

# Check logs
docker logs -f iyzico-api

# Check health
curl http://localhost:3000/health
```

Or use docker-compose:

```yaml
# docker-compose.yml
version: '3.8'
services:
  api:
    build: .
    ports:
      - "3000:3000"
    environment:
      - IYZICO_API_KEY=${IYZICO_API_KEY}
      - IYZICO_SECRET_KEY=${IYZICO_SECRET_KEY}
      - IYZICO_IS_SANDBOX=true
    restart: unless-stopped
```

```bash
docker-compose up -d
```

## 🔐 Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `IYZICO_API_KEY` | Yes | Your Iyzico API key |
| `IYZICO_SECRET_KEY` | Yes | Your Iyzico secret key |
| `IYZICO_IS_SANDBOX` | No | Use sandbox API (default: `true`) |
| `PORT` | No | Server port (default: `3000`) |

## 🚢 Using as a Standalone Project

This example can be used as a template for your own project:

1. **Copy this directory:**

```bash
cp -r examples/hono-app my-api
cd my-api
```

2. **Update `package.json`:**

Change the SDK dependency from local to published version:

```json
{
  "dependencies": {
    "@kaanmertkoc/iyzico-subs-ts": "^1.0.0"
  }
}
```

3. **Install and run:**

```bash
npm install
cp .env.example .env.local
# Edit .env.local with your credentials
npm run dev
```

## 🧪 Development with Local SDK

If you're developing the SDK locally, this example uses `file:../..` to reference it:

```bash
# In SDK root
cd ../..
bun run build

# Back to example
cd examples/hono-app
bun run dev
```

The example will automatically use the local SDK build.

## 📚 Learn More

- [Hono Documentation](https://hono.dev/)
- [Iyzico API Docs](https://dev.iyzipay.com/)
- [@kaanmertkoc/iyzico-subs-ts SDK](https://www.npmjs.com/package/@kaanmertkoc/iyzico-subs-ts)
- [Bun Documentation](https://bun.sh/docs)

## 🐛 Troubleshooting

### "Module not found" errors

Make sure the SDK is built:

```bash
cd ../..
bun run build
```

### Environment variable errors

Verify your `.env.local` file exists and contains all required variables:

```bash
cat .env.local
```

### Port already in use

Change the `PORT` in `.env.local`:

```env
PORT=3001
```

## 📄 License

MIT

---

**Note**: This is an example application. Review and adapt the code for your production needs.
