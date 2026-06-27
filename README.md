# Nubel Store

Professional MVP for Nubel Store, the electronic components catalog and sales subsection of Nubel Systems. It provides a public product catalog with stock and WhatsApp ordering, plus a private dashboard for products, manual sales, inventory adjustments and auditable stock movements.

Nubel Systems can grow with multiple business sections. This project covers Nubel Store and leaves room for a future section focused on Manufacturing of Embedded Systems.

## Stack

- Next.js App Router
- TypeScript
- Tailwind CSS
- Prisma
- PostgreSQL on Supabase
- Zod
- Vercel

## Local Setup

```bash
npm install
cp .env.example .env
npm run prisma:generate
npm run prisma:migrate
npm run prisma:seed
npm run dev
```

Required environment variables:

```bash
DATABASE_URL=
DIRECT_URL=
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_WHATSAPP_NUMBER=
ADMIN_EMAIL=
ADMIN_PASSWORD=
```

Never commit a real `.env` file. `.env.example` is safe to commit.

## Commands

```bash
npm run dev
npm run build
npm run start
npm run lint
npm run prisma:generate
npm run prisma:migrate
npm run prisma:studio
npm run prisma:seed
```

The production build runs `prisma generate && next build`, which is required for Vercel.

## Main Routes

- `/` public home with featured categories and products.
- `/productos` searchable public catalog.
- `/productos/[slug]` product detail with technical attributes and WhatsApp ordering.
- `/dashboard` private summary.
- `/dashboard/productos` product administration.
- `/dashboard/productos/nuevo` create product.
- `/dashboard/productos/[id]/editar` edit product.
- `/dashboard/ventas` sales history.
- `/dashboard/ventas/nueva` manual sale registration.
- `/dashboard/inventario` inventory and manual stock adjustment.
- `/dashboard/stock-movements` stock audit trail.

## Sales and Stock Flow

Manual sales are created on the server. When a sale is registered as `COMPLETED`, the app runs a Prisma transaction that:

- validates stock availability,
- creates the `Sale`,
- creates the `SaleItem` records,
- discounts product stock,
- creates `StockMovement` records with reason `SALE_OUT`.

Pending or cancelled sales do not change stock. Manual stock adjustments also run on the server and always create a stock movement with a mandatory note.

## Supabase and Vercel

1. Create a Supabase project and copy the pooled PostgreSQL connection string to `DATABASE_URL`.
2. Copy the direct connection string to `DIRECT_URL`.
3. Add all variables from `.env.example` to Vercel.
4. Run migrations against Supabase from local development:

```bash
npm run prisma:migrate
npm run prisma:seed
```

5. Deploy to Vercel.

## Security Notes

- Dashboard access is protected by a simple `ADMIN_PASSWORD` cookie flow for the MVP.
- Server actions validate critical inputs with Zod.
- Product totals, sale totals and stock updates are calculated on the server.
- `SUPABASE_SERVICE_ROLE_KEY` must remain server-only.
- The dashboard structure is ready to be replaced by Supabase Auth later.
