# Current Context

## Current Objective

Build Nubel Store as a professional electronics storefront with customer Google accounts, a private electronics operations dashboard, and a separate future 3D printing manufacturer workflow.

## Active Work Area

`auth` + `dashboard`: allow electronics store admins to access the dashboard through Google while keeping this separate from future 3D printing manufacturer roles.

## Relevant Files

- `middleware.ts`
- `src/lib/store-admin.ts`
- `src/lib/customer-auth.ts`
- `src/lib/supabase-server.ts`
- `src/app/actions/customer-auth.ts`
- `src/app/actions/auth.ts`
- `src/app/dashboard/login/page.tsx`
- `src/components/PublicHeader.tsx`
- `src/app/cuenta/page.tsx`

## Decisions

- Public customers authenticate only with Google through Supabase Auth.
- Electronics store admins are identified by allowlisted Google email through `STORE_ADMIN_EMAILS`.
- `erlan514@gmail.com` is the first electronics store admin.
- Admin access is for the electronics store dashboard only, not for future 3D printing manufacturer accounts.
- Real secrets stay in `.env` and must never be committed.

## Risks / Do Not Touch Blindly

- Do not commit `.env` or Supabase secret keys.
- Do not reuse electronics admin access for 3D printing manufacturer roles without a new model.
- Dashboard product, sales, and stock actions must remain protected.
- For Next.js 16 behavior, check local docs under `node_modules/next/dist/docs/` before changing framework-specific APIs.

## Next Step

Set `STORE_ADMIN_EMAILS=erlan514@gmail.com` in Vercel and verify that the Google account can open `/dashboard`.
