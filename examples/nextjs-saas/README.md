# Iyzico Next.js SaaS Starter

A full-stack Next.js SaaS application demonstrating the `@kaanmertkoc/iyzico-subs-ts` SDK with subscription payments, authentication, and PostgreSQL database.

**This example is inspired by [Next.js SaaS Starter](https://github.com/nextjs/saas-starter) but uses Iyzico for subscription payments instead of Stripe.**

## 🚀 Features

- ✅ **Marketing landing page** with animated elements
- ✅ **Pricing page** connected to Iyzico subscription plans
- ✅ **Dashboard** with CRUD operations on users/teams
- ✅ **RBAC** with Owner and Member roles
- ✅ **Subscription management** with Iyzico
- ✅ **Email/password authentication** with JWTs in cookies
- ✅ **Protected routes** with global middleware
- ✅ **Activity logging** for user events
- ✅ **PostgreSQL** database with Drizzle ORM
- ✅ **Docker Compose** for local database
- ✅ **TypeScript** throughout

## 🛠️ Tech Stack

- **Framework**: [Next.js 15](https://nextjs.org/) with App Router & Server Actions
- **Database**: [PostgreSQL](https://www.postgresql.org/)
- **ORM**: [Drizzle ORM](https://orm.drizzle.team/)
- **Payments**: [Iyzico](https://www.iyzico.com/) via `@kaanmertkoc/iyzico-subs-ts`
- **Styling**: [Tailwind CSS 4](https://tailwindcss.com/)
- **UI Components**: [Radix UI](https://www.radix-ui.com/)
- **Authentication**: JWT with cookies

## 📦 Getting Started

### Prerequisites

- Node.js 18+ or Bun
- Docker and Docker Compose
- Iyzico API credentials ([register here](https://merchant.iyzipay.com/))

### Installation

```bash
# From the examples/nextjs-saas directory
npm install
# or
bun install
```

### Setup

1. **Start PostgreSQL with Docker:**

```bash
npm run docker:up
```

2. **Create your environment file:**

```bash
cp .env.example .env.local
```

3. **Edit `.env.local` with your credentials:**

```env
POSTGRES_URL=postgresql://postgres:postgres@localhost:54323/iyzico_saas
IYZICO_API_KEY=your_api_key_here
IYZICO_SECRET_KEY=your_secret_key_here
IYZICO_IS_SANDBOX=true
BASE_URL=http://localhost:3000
AUTH_SECRET=$(openssl rand -base64 32)
```

4. **Run database migrations:**

```bash
npm run db:migrate
```

5. **Seed the database with test data:**

```bash
npm run db:seed
```

This creates a test user:
- **Email**: `test@test.com`
- **Password**: `admin123`

6. **Start the development server:**

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Quick Setup (All-in-one)

```bash
npm run setup
```

This runs Docker, migrations, and seeding in one command.

## 📁 Project Structure

```
nextjs-saas/
├── app/                        # Next.js App Router
│   ├── (dashboard)/           # Protected dashboard routes
│   │   ├── dashboard/         # Main dashboard
│   │   ├── teams/             # Team management
│   │   └── settings/          # User settings
│   ├── (login)/               # Auth routes
│   │   ├── sign-in/          # Login page
│   │   └── sign-up/          # Registration page
│   ├── (marketing)/           # Public marketing pages
│   │   ├── page.tsx          # Landing page
│   │   └── pricing/          # Pricing page
│   └── api/                   # API routes
│       └── iyzico/           # Iyzico webhooks
├── lib/                       # Utilities and business logic
│   ├── db/                    # Database layer
│   │   ├── schema.ts         # Drizzle schema
│   │   ├── queries.ts        # Database queries
│   │   ├── drizzle.ts        # DB client
│   │   ├── setup.ts          # Setup script
│   │   └── seed.ts           # Seed script
│   ├── auth/                  # Authentication
│   │   ├── session.ts        # Session management
│   │   └── middleware.ts     # Auth middleware
│   ├── payments/              # Payment integration
│   │   └── iyzico.ts         # Iyzico client
│   └── utils.ts              # Helper functions
├── components/                # React components
│   ├── ui/                   # UI primitives
│   └── ...                   # App-specific components
├── middleware.ts              # Next.js middleware
├── docker-compose.yml         # PostgreSQL setup
├── drizzle.config.ts         # Drizzle ORM config
└── .env.example              # Environment template
```

## 🎮 Available Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start development server with Turbopack |
| `npm run build` | Build for production |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint |
| `npm run typecheck` | Type check TypeScript |
| `npm run db:setup` | Initialize database |
| `npm run db:seed` | Seed database with test data |
| `npm run db:generate` | Generate new migrations |
| `npm run db:migrate` | Run pending migrations |
| `npm run db:studio` | Open Drizzle Studio |
| `npm run docker:up` | Start PostgreSQL container |
| `npm run docker:down` | Stop PostgreSQL container |
| `npm run docker:logs` | View PostgreSQL logs |
| `npm run setup` | Complete setup (Docker + DB) |

## 💳 Testing Subscriptions

Use Iyzico's test card numbers in sandbox mode:

- **Card Number**: `5528790000000008`
- **Expiry**: `12/2030`
- **CVV**: `123`
- **Cardholder Name**: Any name

## 🔄 How It Works

### 1. User Registration & Authentication

- Users sign up with email/password
- Passwords are hashed with bcrypt
- Sessions use JWT tokens stored in HTTP-only cookies
- Protected routes check authentication via middleware

### 2. Subscription Flow

1. User views pricing plans on `/pricing`
2. Clicks "Subscribe" → redirected to Iyzico checkout
3. Completes payment with Iyzico
4. Webhook receives payment confirmation
5. Database updated with subscription status
6. User gets access to premium features

### 3. Team Management

- Each user can create/join teams
- Role-based access control (Owner/Member)
- Activity logging for audit trails

## 🌐 Deployment

### Vercel

1. **Push to GitHub**
2. **Import in Vercel**
3. **Set root directory**: `examples/nextjs-saas`
4. **Add environment variables** in Vercel dashboard:
   - `POSTGRES_URL` - Your production database URL
   - `IYZICO_API_KEY` - Production API key
   - `IYZICO_SECRET_KEY` - Production secret key
   - `IYZICO_IS_SANDBOX` - Set to `false`
   - `BASE_URL` - Your production domain
   - `AUTH_SECRET` - Random secret (use `openssl rand -base64 32`)
5. **Deploy!**

### Coolify

1. Create new service in Coolify
2. Connect your repository
3. Set build command: `npm run build`
4. Set start command: `npm run start`
5. Set root directory: `examples/nextjs-saas`
6. Add environment variables
7. Create PostgreSQL database in Coolify
8. Update `POSTGRES_URL` with Coolify's database URL
9. Deploy!

### Docker

```bash
# Build
docker build -t iyzico-saas .

# Run
docker run -p 3000:3000 --env-file .env.local iyzico-saas
```

## 🔐 Environment Variables

### Required

- `POSTGRES_URL` - PostgreSQL connection string
- `IYZICO_API_KEY` - Iyzico API key
- `IYZICO_SECRET_KEY` - Iyzico secret key
- `AUTH_SECRET` - Random secret for JWT signing
- `BASE_URL` - Application URL

### Optional

- `IYZICO_IS_SANDBOX` - Use sandbox API (default: `false`)

## 🔧 Development Tips

### Using the Iyzico SDK

The SDK is initialized in `lib/payments/iyzico.ts`:

```typescript
import { IyzicoClient } from '@kaanmertkoc/iyzico-subs-ts';

export const iyzico = new IyzicoClient({
  apiKey: process.env.IYZICO_API_KEY!,
  secretKey: process.env.IYZICO_SECRET_KEY!,
  isSandbox: process.env.IYZICO_IS_SANDBOX === 'true'
});
```

### Modifying Database Schema

1. Edit `lib/db/schema.ts`
2. Generate migration: `npm run db:generate`
3. Apply migration: `npm run db:migrate`

### Drizzle Studio

View and edit your database visually:

```bash
npm run db:studio
```

Open [https://local.drizzle.studio](https://local.drizzle.studio)

### Local SDK Development

This example uses `workspace:*` to reference the local SDK during development. When you make changes to the SDK:

```bash
# In SDK root
cd ../..
npm run build

# Restart Next.js dev server
cd examples/nextjs-saas
npm run dev
```

## 🚢 Publishing as a Standalone Project

This example can be forked and used as a standalone project:

1. **Fork/Copy the `examples/nextjs-saas` directory**
2. **Update `package.json`**: Change `@kaanmertkoc/iyzico-subs-ts` from `workspace:*` to the published version (e.g., `^1.0.0`)
3. **Run `npm install`**
4. **Follow the setup instructions above**

## 📚 Learn More

- [Iyzico API Documentation](https://dev.iyzipay.com/)
- [Next.js Documentation](https://nextjs.org/docs)
- [Drizzle ORM Docs](https://orm.drizzle.team/)
- [@kaanmertkoc/iyzico-subs-ts](https://www.npmjs.com/package/@kaanmertkoc/iyzico-subs-ts)
- [Original Next.js SaaS Starter](https://github.com/nextjs/saas-starter)

## 🤝 Contributing

Issues and pull requests are welcome! For major changes, please open an issue first.

## 📄 License

MIT

---

**Note**: This is an example application demonstrating the Iyzico SDK. Review and customize the code for your production use case.
