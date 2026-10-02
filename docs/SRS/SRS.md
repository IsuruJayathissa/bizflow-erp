# Software Requirements Specification (SRS)

## Project Name
**BizFlow ERP – Small Business Enterprise Resource Planning System**

## Author
**Isuru Jayathissa**

---

## 1. System Overview & Technology Stack

| Layer | Component | Choice |
|---|---|---|
| Frontend | Framework | Next.js (App Router) + TypeScript |
| UI & Styling | CSS | Tailwind CSS + Lucide Icons |
| State & Query | Data Fetching | TanStack React Query |
| Backend | Application Server | NestJS + TypeScript |
| Database | Relational Database | PostgreSQL (Neon / Supabase / Local) |
| ORM | Data Modeling | Prisma ORM |
| Auth & Security | Token Strategy | JWT Access + Refresh Tokens, Bcrypt |
| API Docs | Documentation | OpenAPI / Swagger |
| Analytics | Charting | Recharts |
| Testing | Test Runners | Jest + Supertest |

---

## 2. Core Stakeholders & Roles

1. **Admin**: Complete system oversight, user accounts, business configurations, audit logs, financial reports.
2. **Manager**: Daily operational control, customer records, supplier accounts, catalog, sales & purchase management.
3. **Sales Staff**: Direct sales processing, invoice issuance, customer balance tracking, payment receipting.
4. **Inventory Staff**: Goods receiving, catalog updates, stock movement tracking, threshold alert monitoring.
5. **Accountant**: Operational expense recording, accounts receivable/payable tracking, profit/loss balance review.

---

## 3. Functional Requirements (FR-01 to FR-20)

- **FR-01 Authentication**: Registration, Login, Token Refresh, Password updates.
- **FR-02 User Administration**: Create, view, update, deactivate staff members.
- **FR-03 Role-Based Access Control**: Guards enforcing role boundaries at the API and UI layers.
- **FR-04 Business Profile**: Business entity configuration, tax identifiers, invoice formatting.
- **FR-05 Customer Management**: CRM profiles, purchase history, outstanding ledger.
- **FR-06 Supplier Management**: SCM contacts, purchase history, supplier dues.
- **FR-07 Product Catalog**: SKU validation, barcode mapping, purchase/sales pricing, low-stock threshold.
- **FR-08 Category Taxonomy**: Multi-tier product grouping.
- **FR-09 Inventory Movements**: Automatic Stock IN (purchases), Stock OUT (sales), and Stock Adjustments.
- **FR-10 Low Stock Alerts**: Automatic status warnings when `currentStock <= minStock`.
- **FR-11 Purchase Management**: Purchase order creation, receiving workflow, inventory increments.
- **FR-12 Sales Management**: POS sales creation, automatic inventory decrements, invoice linking.
- **FR-13 Invoice Generation**: Professional invoice generation with subtotal, discounts, and taxes.
- **FR-14 Payment Ledger**: Tracking payment methods (Cash, Card, Bank Transfer) against invoices and purchases.
- **FR-15 Expense Management**: Categorized business expenditure logging.
- **FR-16 Executive Dashboard**: Real-time KPI summary cards and Recharts analytics.
- **FR-17 Business Reports**: Daily, weekly, and monthly sales, inventory valuation, and profit reports.
- **FR-18 Search & Filtering**: Multi-parameter search across all tables and entities.
- **FR-19 System Notifications**: Critical alerts for low stock and pending payments.
- **FR-20 Audit Logging**: Tamper-evident logging of administrative and financial modifications.
