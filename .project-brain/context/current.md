# Current Context

## Current Objective

Build Nubel Store as a professional electronics storefront with a private operations dashboard and a growing 3D printing quote workflow.

## Active Work Area

`print-quote`: STL preview, dimension detection, scale correction, printer bed fit, and future manufacturer matching.

## Relevant Files

- `src/components/PrintQuoteWorkspace.tsx`
- `src/app/cotizar-impresion-3d/page.tsx`
- `src/components/PublicHeader.tsx`
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

Design the manufacturer registration and machine/pricing data model before implementing provider matching.
