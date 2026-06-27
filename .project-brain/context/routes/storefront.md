# Public Storefront And Catalog

## Para qué sirve

Sell Nubel Store as the public face of the electronics shop: landing page, product search, product details, WhatsApp purchase intent, and navigation to Nubel Systems and manufacturing services.

## Primary Files

- `src/app/page.tsx`
- `src/app/productos/page.tsx`
- `src/app/productos/[slug]/page.tsx`
- `src/components/PublicHeader.tsx`
- `src/components/ProductCard.tsx`
- `src/components/SearchInput.tsx`
- `src/components/WhatsAppButton.tsx`
- `src/lib/products.ts`
- `src/lib/whatsapp.ts`

## Decisions

- Brand name shown publicly: Nubel Store.
- Visual language: black and white base with warm yellow/orange interaction color.
- Admin dashboard must not be exposed as a normal public CTA.

## Risks

- Product pages query the database, so missing Supabase/Postgres env vars break production runtime.
- Public UI must stay direct and commercial, not a fake landing page with no buying path.

## Cómo modificar con seguridad

- Run `npm run lint` and `npm run build`.
- Verify `/`, `/productos`, and one product detail page.
- Keep public CTAs customer-facing; admin access belongs behind auth/navigation state.
