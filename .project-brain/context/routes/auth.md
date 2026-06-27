# Customer And Admin Authentication

## Para qué sirve

Support Google-only customer accounts while keeping admin dashboard access controlled separately.

## Primary Files

- `src/app/login/page.tsx`
- `src/app/crear-cuenta/page.tsx`
- `src/app/cuenta/page.tsx`
- `src/app/auth/callback/route.ts`
- `src/app/actions/customer-auth.ts`
- `src/app/actions/auth.ts`
- `src/lib/customer-auth.ts`
- `src/lib/supabase-server.ts`
- `middleware.ts`
- `prisma/schema.prisma`

## Decisions

- Customer accounts are created only through Google OAuth.
- Supabase Auth owns the browser session.
- Local `CustomerAccount` records store app-level customer profile data.
- Admin dashboard protection remains a separate flow for now.

## Risks

- Supabase redirect URLs must match production and local environments.
- Secret keys belong only in Vercel/Supabase/local `.env`, never in Git.
- Avoid mixing customer session permissions with admin dashboard access.

## Cómo modificar con seguridad

- Run `npm run lint` and `npm run build`.
- Test Google login redirect locally and in Vercel after env changes.
- Confirm admin dashboard protection still works separately from customer sessions.
