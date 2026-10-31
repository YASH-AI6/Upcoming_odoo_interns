# Subscription Management System (Backend)

High-performance, idempotent Subscription Management backend built with Node.js, Express, TypeScript, PostgreSQL, and Prisma ORM.

## Tech Stack
- **Runtime & Language**: Node.js v20+, TypeScript
- **Framework**: Express.js
- **Database & ORM**: PostgreSQL, Prisma ORM
- **Validation**: Zod
- **Auth**: JWT, bcryptjs
- **Email & PDF**: Nodemailer, PDFKit
- **Scheduler**: node-cron
- **Testing**: Jest, Supertest

## Environment Variables
Copy `.env.example` to `.env`:

```env
PORT=4000
NODE_ENV=development
DATABASE_URL="postgresql://postgres:postgres@127.0.0.1:5432/subscription_db?schema=public"
JWT_SECRET="super-secret-jwt-key-for-subscription-backend-hackathon-2026"
JWT_EXPIRES_IN="7d"
SMTP_HOST="smtp.ethereal.email"
SMTP_PORT=587
SMTP_USER=""
SMTP_PASS=""
SMTP_FROM="noreply@subscription.local"
FRONTEND_URL="http://localhost:3000"
```

## Quick Start Commands

```bash
# Install dependencies
npm install

# Run database migrations
npx prisma migrate dev

# Seed database with 5,000+ subscriptions, 200 customers, products, plans, taxes, discounts
npm run seed

# Run automated tests (Jest + Supertest)
npm test

# Run development server (with auto-reload)
npm run dev
```

## Seed Credentials
- **Admin**: `admin@example.com` / `AdminPassword123!`
- **Staff**: `staff1@example.com` / `StaffPassword123!`
- **Staff 2**: `staff2@example.com` / `StaffPassword123!`
- **Customer**: `customer1@business.org` / `CustomerPassword123!`

## API Overview (Prefix: `/api/v1`)

### Authentication
- `POST /api/v1/auth/signup` - Register new customer (enforces strict password complexity)
- `POST /api/v1/auth/login` - Authenticate and receive JWT
- `POST /api/v1/auth/forgot-password` - Request password reset token via email
- `POST /api/v1/auth/reset-password` - Reset password with token
- `GET /api/v1/auth/me` - Current authenticated user details

### Users (Admin)
- `POST /api/v1/users/staff` - Create staff member (ADMIN only)
- `GET /api/v1/users` - List all users with pagination and search
- `GET /api/v1/users/:id` - Get user by ID

### Customers (Admin & Staff)
- `POST /api/v1/customers` - Create customer
- `GET /api/v1/customers` - List customers (server-side pagination, search, filters)
- `GET /api/v1/customers/:id` - Customer profile with recent subscriptions & invoices
- `PUT /api/v1/customers/:id` - Update customer
- `DELETE /api/v1/customers/:id` - Delete customer (if no linked records)

### Products & Variants (Admin: write, Staff: read)
- `GET /api/v1/products` - List products with variants and tax rules
- `GET /api/v1/products/:id` - Product details
- `POST /api/v1/products` - Create product with variants (e.g. Odoo brand = +$560)
- `PUT /api/v1/products/:id` - Update product
- `DELETE /api/v1/products/:id` - Delete product
- `POST /api/v1/products/:id/variants` - Add product variant
- `DELETE /api/v1/products/:productId/variants/:variantId` - Delete variant

### Plans (Admin: write, Staff/Customer: read)
- `GET /api/v1/plans` - List plans (filter by billing period: DAILY, WEEKLY, MONTHLY, YEARLY)
- `GET /api/v1/plans/:id` - Plan details
- `POST /api/v1/plans` - Create plan (flags: autoClose, closable, pausable, renewable)
- `PUT /api/v1/plans/:id` - Update plan
- `DELETE /api/v1/plans/:id` - Delete plan

### Quotation Templates (Admin & Staff)
- `GET /api/v1/templates` - List quotation templates
- `GET /api/v1/templates/:id` - Get template details with product lines
- `POST /api/v1/templates` - Create quotation template
- `PUT /api/v1/templates/:id` - Update quotation template
- `DELETE /api/v1/templates/:id` - Delete quotation template

### Subscriptions & State Machine
- `GET /api/v1/subscriptions` - List subscriptions (filtered, paginated, customer-scoped)
- `GET /api/v1/subscriptions/:id` - Subscription details
- `POST /api/v1/subscriptions` - Create subscription (manual lines or from template)
- `PUT /api/v1/subscriptions/:id` - Update subscription
- `POST /api/v1/subscriptions/:id/confirm` - Transition DRAFT/QUOTATION -> CONFIRMED
- `POST /api/v1/subscriptions/:id/activate` - Transition CONFIRMED -> ACTIVE
- `POST /api/v1/subscriptions/:id/pause` - Transition ACTIVE -> PAUSED (requires plan.pausable)
- `POST /api/v1/subscriptions/:id/resume` - Transition PAUSED -> ACTIVE
- `POST /api/v1/subscriptions/:id/close` - Transition -> CLOSED (requires plan.closable)
- `POST /api/v1/subscriptions/:id/renew` - Renew subscription (requires plan.renewable)

### Taxes & Discounts (Admin: write, Staff: read)
- `GET /api/v1/taxes` & `POST /api/v1/taxes` - Tax rules management
- `GET /api/v1/discounts` & `POST /api/v1/discounts` - Discount rules (usage limits, scopes, date windows)

### Invoices & Payments
- `GET /api/v1/invoices` - List invoices (overdue bucketing: 1-7, 8-30, 30+ days)
- `GET /api/v1/invoices/:id` - Get invoice details
- `POST /api/v1/invoices` - Create draft invoice
- `POST /api/v1/invoices/:id/confirm` - Confirm invoice
- `POST /api/v1/invoices/:id/cancel` - Cancel invoice (forbidden if PAID)
- `POST /api/v1/invoices/:id/send` - Email invoice with PDF attachment
- `GET /api/v1/invoices/:id/pdf` - Stream/download printable PDF invoice
- `POST /api/v1/invoices/:id/payments` - Record payment (auto-transitions to PAID when amountPaid >= total)
- `GET /api/v1/invoices/:id/payments` - List payments for invoice
- `GET /api/v1/payments` - List all payments with pagination

### Billing Engine (Time Machine)
- `POST /api/v1/billing/preview` - Preview prospective invoice generation without writing (dryRun = true)
- `POST /api/v1/billing/run` - Execute idempotent batch billing for a target date
- **Automated**: Nightly cron job runs automatically at midnight (`0 0 * * *`)

### Dashboard (Admin & Staff)
- `GET /api/v1/dashboard/summary` - Aggregated metrics via SQL: active subscription counts, MRR, ARR, revenue collected, outstanding amount, overdue count and overdue buckets (1-7, 8-30, 30+ days)

### Customer Portal (Customer Scoped)
- `GET /api/v1/portal/subscriptions` - Subscriptions belonging to the authenticated customer
- `GET /api/v1/portal/invoices` - Invoices belonging to the authenticated customer
- `GET /api/v1/portal/payments` - Payments belonging to the authenticated customer

