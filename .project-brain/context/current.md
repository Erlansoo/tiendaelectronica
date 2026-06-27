# Current Context

## Current Objective

Build Nubel Store as a professional electronics storefront with a private operations dashboard and a growing 3D printing quote workflow.

## Active Work Area

`auth`: consolidate Google-only customer accounts while keeping admin dashboard authentication separate.

## Relevant Files

- `src/app/login/page.tsx`
- `src/app/crear-cuenta/page.tsx`
- `src/app/auth/callback/route.ts`
- `src/app/actions/customer-auth.ts`
- `src/lib/customer-auth.ts`
- `src/lib/supabase-server.ts`
- `prisma/schema.prisma`

## Decisions

- Public customers authenticate only with Google through Supabase Auth.
- Admin access remains separate and protected by the dashboard flow.
- 3D print quoting starts as a local client workflow before becoming a manufacturer marketplace.
- Real secrets stay in `.env` and must never be committed.

## Risks / Do Not Touch Blindly

- Do not commit `.env` or Supabase secret keys.
- Do not rewrite the whole UI when a focused route change is enough.
- For Next.js 16 behavior, check local docs under `node_modules/next/dist/docs/` before changing framework-specific APIs.
- The 3D viewer depends on browser APIs and must stay client-side.

## Next Step

Test Google OAuth in Supabase/Vercel with the production callback URL and confirm local `CustomerAccount` records are created.
