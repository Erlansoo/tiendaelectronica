# Architecture

## System Map

Next.js App Router powers the public storefront, customer auth pages, admin dashboard, and 3D print quote workflow. Prisma connects to PostgreSQL/Supabase. Supabase Auth handles Google customer sessions.

## Important Constraints

- Client-side Three.js logic belongs in client components.
- Prisma writes for stock and sales must remain transactional.
- Real secrets stay outside Git in `.env` and Vercel environment variables.
- Check Next.js 16 local docs before changing framework APIs.
