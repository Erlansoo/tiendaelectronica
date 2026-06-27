# Admin Dashboard, Products And Operations

## Para qué sirve

Manage products, manual sales, stock, and auditable stock movements for internal operations.

## Primary Files

- `src/app/dashboard/page.tsx`
- `src/app/dashboard/layout.tsx`
- `src/app/dashboard/productos/page.tsx`
- `src/app/dashboard/productos/nuevo/page.tsx`
- `src/app/dashboard/productos/[id]/editar/page.tsx`
- `src/app/dashboard/ventas/page.tsx`
- `src/app/dashboard/ventas/nueva/page.tsx`
- `src/app/dashboard/inventario/page.tsx`
- `src/app/dashboard/stock-movements/page.tsx`
- `src/app/actions/products.ts`
- `src/app/actions/sales.ts`
- `src/app/actions/stock.ts`
- `src/components/DashboardNav.tsx`
- `src/components/ProductForm.tsx`
- `src/components/ProductTable.tsx`
- `src/components/SaleForm.tsx`
- `prisma/schema.prisma`

## Decisions

- Sales completed through the dashboard decrement stock.
- Stock changes must create `StockMovement` records.
- Product category and supplier are simple fields for the MVP.
- Google users listed in `STORE_ADMIN_EMAILS` can access the electronics dashboard.

## Risks

- Stock updates must stay transactional.
- Never bypass validation in server actions.
- Admin and customer auth should remain separate until a deliberate unification is designed.
- Do not reuse electronics admin access for 3D printing manufacturer accounts.

## Cómo modificar con seguridad

- Run `npm run lint` and `npm run build`.
- Test create/edit product, completed sale, insufficient stock, and manual stock adjustment.
- Keep Prisma stock updates inside transactions.
