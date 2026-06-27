# Interaction Memory

## Current Thread

- Built the MVP electronics store.
- Added Supabase/Postgres env setup guidance.
- Improved public landing page and navigation.
- Added Google-only customer accounts.
- Added a Three.js 3D print quote route.
- Added STL preview, dimension detection, scale suggestion, and printer bed fit validation.
- Installed Project Brain Map for focused context and route-based project memory.
- Consolidated Google customer auth around a shared profile upsert, safe callback redirects, and logged-in redirects from login/create-account pages.

## Resolved

- Vercel build requires database environment variables.
- Public admin dashboard link was removed from normal storefront navigation.
- STL scale ambiguity is handled by showing dimensions and scale controls.
- Google customer profiles are ensured from the Supabase user session instead of only being created in the callback.
- OAuth redirect generation now prefers `NEXT_PUBLIC_SITE_URL` over request origin to avoid production login returning to localhost.
- Production OAuth redirect generation now ignores localhost values and falls back to Vercel/request host.

## Next

- Design manufacturer registration, machine profiles, pricing rules, and compatible provider matching.
