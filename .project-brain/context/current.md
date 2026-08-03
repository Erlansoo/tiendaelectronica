# Current Context

## Current Objective

Build Nubel Store as a professional electronics storefront with customer Google accounts, a private electronics operations dashboard, and a separate 3D printing manufacturer marketplace.

## Active Work Area

`manufacturing marketplace`: verified access requests, independent manufacturer capabilities, machines, materials, inventory, costs, private files and automatic quote estimates.

## Relevant Files

- `proxy.ts`
- `src/lib/store-admin.ts`
- `src/lib/customer-auth.ts`
- `src/lib/supabase-server.ts`
- `src/app/actions/customer-auth.ts`
- `src/app/actions/auth.ts`
- `src/app/dashboard/login/page.tsx`
- `src/components/PublicHeader.tsx`
- `src/app/cuenta/page.tsx`
- `src/lib/session.ts`
- `src/components/SessionInactivityGuard.tsx`
- `src/components/CookieConsent.tsx`
- `src/app/actions/manufacturing.ts`
- `src/lib/manufacturing.ts`
- `src/lib/manufacturing-calculator.ts`
- `src/app/cuenta/manufactura/page.tsx`
- `src/app/dashboard/manufactura/solicitudes/page.tsx`
- `prisma/schema.prisma`

## Decisions

- Public customers authenticate only with Google through Supabase Auth.
- Electronics store admins are identified by allowlisted Google email through `STORE_ADMIN_EMAILS`.
- `erlan514@gmail.com` is the first electronics store admin.
- Admin access is for the electronics store dashboard only, not for future 3D printing manufacturer accounts.
- `STORE_ADMIN_EMAILS` are store owners; `STORE_STAFF_EMAILS` are operational staff. Staff can manage the electronics catalog, inventory and sales, but cannot access manufacturing administration, private evidence, payment confirmation, disputes or payouts.
- Real secrets stay in `.env` and must never be committed.
- Authenticated sessions expire after 15 minutes without browser activity; the server also validates the last recorded activity before serving protected customer or dashboard data.
- Optional browser storage (language preference) requires cookie consent; authentication cookies remain necessary.
- Manufacturer access is a separate `MANUFACTURER` account capability and never grants electronics `/dashboard` access.
- Manufacturer approval codes are Google-email-bound and stored only as hashes. They expire after seven days before first activation; once activated, the same 20-character code unlocks the manufacturer panel in the current browser session. Five failed attempts lock access for 15 minutes.
- Manufacturing evidence and quote models use private Supabase buckets and short signed URLs.
- Quote cards show each compatible manufacturer's commercial name, logo, city and delivery mode. WhatsApp, contact email, pickup address and map remain private until that customer selects the offer.
- Material availability and reservations are changed atomically and recorded through inventory movements.
- Advanced FDM/resin settings feed the estimate. A quote with no compatible manufacturer is not retained: its private uploaded models are removed and the customer can adjust and retry.
- The first manufacturer response is measured from offer selection to confirmation or revision. The median valid historical time is shown on later offers and can sort them by fastest response.
- Public manufacturing capacity is derived only from active, approved manufacturer machines.
- BOB is the only marketplace currency in v1; payments, commissions, ratings and seller onboarding remain disabled.

## Risks / Do Not Touch Blindly

- Do not commit `.env` or Supabase secret keys.
- Do not reuse electronics admin access for 3D printing manufacturer roles without a new model.
- Do not expose private evidence, quote files, manufacturer cost breakdowns, email or phone to unselected users.
- Supabase currently enforces a 50 MB object limit for `manufacturing-quotes`; the application is designed for 100 MB and requires a Supabase plan/storage-limit increase to enable the full limit.
- Dashboard product, sales, and stock actions must remain protected.
- For Next.js 16 behavior, check local docs under `node_modules/next/dist/docs/` before changing framework-specific APIs.

## Next Step

Set `MANUFACTURER_INVITE_PEPPER` and `CRON_SECRET` in Vercel, increase the Supabase Storage object limit to 100 MB, then run end-to-end onboarding with a verified manufacturer before enabling customer quote traffic.
