# Interaction Memory

## Current Thread

- Built the MVP electronics store.
- Added Supabase/Postgres env setup guidance.
- Improved public landing page and navigation.
- Added Google-only customer accounts.
- Added a Three.js 3D print quote route.
- Added STL preview, dimension detection, scale suggestion, and printer bed fit validation.
- Installed Project Brain Map for focused context and route-based project memory.
- Added Google allowlist access for electronics store admins through `STORE_ADMIN_EMAILS`.

## Resolved

- Vercel build requires database environment variables.
- Public admin dashboard link was removed from normal storefront navigation.
- STL scale ambiguity is handled by showing dimensions and scale controls.
- `erlan514@gmail.com` can be treated as an electronics store admin without granting 3D printing manufacturer permissions.

## Next

- Set `STORE_ADMIN_EMAILS=erlan514@gmail.com` in Vercel and verify `/dashboard` access after Google login.
