# BizFlow ERP – Small Business Enterprise Resource Planning System

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/Node.js-v22+-green.svg)](https://nodejs.org/)
[![Next.js](https://img.shields.io/badge/Next.js-v15+-black.svg)](https://nextjs.org/)
[![NestJS](https://img.shields.io/badge/NestJS-v10+-red.svg)](https://nestjs.com/)
[![Prisma](https://img.shields.io/badge/Prisma-ORM-teal.svg)](https://www.prisma.io/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Database-336791.svg)](https://www.postgresql.org/)

> A production-oriented full-stack ERP platform for small and medium-sized businesses, featuring role-based access control, inventory tracking, sales & purchasing workflows, financial analytics, audit logging, and automated business operations.

---

## 📌 Features Overview

- **Authentication & RBAC**: JWT Access & Refresh Tokens, 5 distinct roles (`ADMIN`, `MANAGER`, `SALES_STAFF`, `INVENTORY_STAFF`, `ACCOUNTANT`).
- **Business Profile Management**: Company identity, tax rules, currency, invoice prefix.
- **Customer & Supplier Management (CRM/SCM)**: Full profiles, transaction history, balance tracking.
- **Product & Category Catalog**: SKU/barcode generation, pricing rules, category organization.
- **Inventory & Stock Movement**: Stock IN/OUT/ADJUSTMENT, automated low-stock warnings.
- **Purchase Management**: Supplier purchase orders, automated inventory increment, balance calculation.
- **Sales & Invoicing**: POS-like checkout flow, stock auto-deduction, printable invoices.
- **Finance & Expense Tracking**: Categorized expenses, payment records (Cash, Card, Bank Transfer).
- **Interactive Dashboard & Reports**: Real-time KPI summaries, visual charts (Recharts), customizable report exports.
- **Audit Logging & Notifications**: Comprehensive tracking of operations and critical alerts.

---

## 🛠️ Technology Stack

| Layer | Technology |
|---|---|
| **Frontend** | [Next.js](https://nextjs.org/) (App Router), TypeScript, [Tailwind CSS](https://tailwindcss.com/), TanStack Query |
| **Backend** | [NestJS](https://nestjs.com/), TypeScript, Class Validator |
| **ORM & Database** | [Prisma](https://www.prisma.io/), [PostgreSQL](https://www.postgresql.org/) (Neon / Supabase / Local) |
| **Authentication** | Passport.js, JWT, Refresh Tokens, Bcrypt |
| **Charts & UI** | Lucide Icons, Recharts |
| **API Documentation** | Swagger / OpenAPI (`/api/docs`) |
| **Testing** | Jest, Supertest |
| **Architecture** | Monorepo with npm workspaces |

---

## 📂 Project Architecture

```
bizflow-erp/
├── apps/
│   ├── web/                     # Next.js App Router Frontend
│   │   ├── src/
│   │   │   ├── app/             # (auth), (dashboard) page routes
│   │   │   ├── components/      # UI, layout, and domain-specific components
│   │   │   ├── lib/             # API client, auth helpers, utilities
│   │   │   └── hooks/           # Data & auth custom hooks
│   │   └── package.json
│   │
│   └── api/                     # NestJS Backend API
│       ├── src/
│       │   ├── auth/            # JWT, RBAC guards & strategies
│       │   ├── users/           # User administration
│       │   ├── customers/       # Customer management
│       │   ├── suppliers/       # Supplier management
│       │   ├── products/        # Product catalog & pricing
│       │   ├── categories/      # Category taxonomy
│       │   ├── inventory/       # Stock tracking & movements
│       │   ├── sales/           # Sales orders & checkouts
│       │   ├── purchases/       # Supplier purchase orders
│       │   ├── invoices/        # Billing & invoice generation
│       │   ├── payments/        # Payment records & ledger
│       │   ├── expenses/        # Operational expense tracking
│       │   ├── reports/         # Business analytics & exports
│       │   ├── audit/           # Audit logging interceptor
│       │   └── common/          # Filters, interceptors, decorators
│       └── package.json
│
├── packages/
│   └── shared/                  # Shared types, interfaces, enums, constants
│
├── prisma/
│   ├── schema.prisma            # Relational database schema
│   └── seed.ts                  # Demo data seed script
│
├── docs/                        # SRS, architecture, and diagrams
└── tests/                       # E2E and integration tests
```

---

## 🚀 Getting Started

### Prerequisites

- **Node.js**: `v20+` or `v22+`
- **npm**: `v10+`
- **PostgreSQL**: Local instance or cloud database (Neon, Supabase)

### 1. Installation

```bash
# Clone the repository
git clone https://github.com/IsuruJayathissa/bizflow-erp.git
cd bizflow-erp

# Install dependencies across all workspaces
npm install
```

### 2. Environment Configuration

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

Update `DATABASE_URL` with your PostgreSQL connection string.

### 3. Database Migration & Seeding

```bash
# Generate Prisma Client & push schema
npm run db:push

# (Optional) Seed initial data
npm run db:seed
```

### 4. Running the Development Servers

```bash
# Start backend and frontend simultaneously
npm run dev

# Or run separately:
npm run dev:api     # Backend API on http://localhost:4000
npm run dev:web     # Frontend Web on http://localhost:3000
```

- **Frontend Application**: [http://localhost:3000](http://localhost:3000)
- **Backend API Docs (Swagger)**: [http://localhost:4000/api/docs](http://localhost:4000/api/docs)

---

## 👤 Author

- **Isuru Jayathissa**
