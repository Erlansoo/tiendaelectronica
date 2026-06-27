# 3D Print Quote Workflow

## Para qué sirve

Let customers upload a 3D file, preview STL geometry, detect dimensions, correct scale, choose print settings, and request a quote. This will evolve into a manufacturer marketplace with registered machines and provider-specific pricing.

## Primary Files

- `src/app/cotizar-impresion-3d/page.tsx`
- `src/components/PrintQuoteWorkspace.tsx`
- `src/components/PublicHeader.tsx`
- `prisma/schema.prisma`

## Current Behavior

- STL files under 100 MB can be previewed in a Three.js viewer.
- The viewer detects original X/Y/Z dimensions.
- The workflow suggests scale presets: `1`, `0.1`, `0.01`, `0.001`.
- The user can select printer bed sizes and manually adjust scale.
- The quote button is disabled when the scaled model does not fit the selected bed.

## Near Future

- Add manufacturer registration.
- Add printer machine profiles with technology, bed volume, materials, and pricing rules.
- Match quote requests to compatible manufacturers.
- Let the customer compare compatible providers before sending the request.

## Risks

- STL units are ambiguous. Do not assume meters, centimeters, or millimeters without showing dimensions and scale controls.
- Three.js viewer logic must stay client-side.
- Marketplace matching needs a real Prisma model before UI work.

## Cómo modificar con seguridad

- Run `npm run lint` and `npm run build`.
- Test the route in a browser with a valid STL.
- Verify oversized STL behavior: suggested scale, bed warning, and disabled quote button.
- Keep viewer and file parsing code inside client components.
