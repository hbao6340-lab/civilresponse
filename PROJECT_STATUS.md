# CIVIRESPOND — Project Status

**Last updated:** 2026-11-04 · **Phase:** 1 of 8 (Foundation) · **Branch:** main (local)

## Current phase summary

Phase 1 is implemented: Next.js 16 foundation, Tailwind v4 design system,
Supabase client wiring, full PostGIS schema + RLS + RPC migrations, public
site, protected responder/admin shells, the complete `/api/v1` route surface
with Zod validation, MapLibre map, and the docs set. The app builds, lints
and type-checks with **zero backend credentials** (safe degradation: banner +
`503 not_configured` + labelled demo map).

## Honest feature status

| Feature | Status |
|---|---|
| Design system (navy/white/grey, status colours) | ✅ Real |
| Public pages (/, about, privacy, terms, safety) | ✅ Real |
| Responder map (MapLibre, jittered markers) | ⚠️ Real code; live markers need backend. Demo markers are **explicitly labelled** |
| Emergency reporting + secure tracking | ⚠️ Real validation/flow; persistence needs backend |
| Auth (Supabase SSR, callback, proxy guard, layouts) | ⚠️ Wired; needs env vars + dashboard config |
| Responder dashboard, duty mode, real GPS (`watchPosition`) | ⚠️ Real code; end-to-end needs backend |
| PostGIS search, dispatch, messaging, push | ⚠️ API + RPC real; needs backend to exercise |
| Admin dashboards + CSV export | ⚠️ Real UI/API; needs backend data |
| CAPTCHA, Redis rate limits, CSP headers | ❌ Not yet (schema slots documented; Phase 5/7) |
| Mobile app | ❌ Phase 8 (backend already shaped for it) |

Nothing is marked complete that is only a mockup — see the ⚠️ flags above.

## Project structure

```
supabase/migrations/  0001_init.sql, 0002_seed.sql      (source of truth)
src/app/              public + responder + admin routes, api/v1/* routes
src/lib/              env, constants, validation, auth, api, geo, rate-limit
src/components/       layout, map, ui (badge/button/card), providers
docs/                 ARCHITECTURE, DATABASE, API, SECURITY, DEPLOYMENT
PROJECT_STATUS.md · CHANGELOG.md · README.md
```

## Dependencies installed (Phase 1)

`next@16.4.5`, `react@19.3.0`, `tailwindcss@4.3.4`, `@supabase/ssr`,
`@supabase/supabase-js`, `zod@4`, `react-hook-form`, `@hookform/resolvers`,
`@tanstack/react-query`, `maplibre-gl`, `lucide-react`, `clsx`, `tailwind-merge`,
`class-variance-authority`, `@radix-ui/react-slot`.

## Migrations

- `0001_init.sql` — enums, 17 tables, GiST indexes, triggers, RLS, buckets,
  RPC (`find_nearby_responders`, `upsert_responder_location`,
  `public_responder_markers`, `submit_incident`, `set_assignment_action`,
  `set_consent`, `set_responder_verification`, `admin_summary`,
  `admin_export_csv`)
- `0002_seed.sql` — 5 HCMC operating areas (**dev only**)

## Verification performed

| Check | Result |
|---|---|
| `npm run typecheck` | ✅ PASS (tsc --noEmit, 0 errors) |
| `npm run lint` | ✅ PASS (eslint ., 0 errors) |
| `npm run build` | ✅ PASS (Turbopack, 39 routes, compiled clean, 0 warnings) |
| Dev server boot | ✅ PASS — `npm run dev` Ready in 810ms; smoke tests: `GET /` 200 (45181 B, dev banner present), `GET /api/v1/map/responders` 200 (`markers:[] demo:true`), `GET /map` 200 |

## Missing credentials / external config

`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
`SUPABASE_SERVICE_ROLE_KEY` (with user roles seeded), Supabase Auth dashboard
settings (email confirm, site URL, MFA), optionally
`NEXT_PUBLIC_MAP_TILES_URL`, Turnstile keys, VAPID keys.

## Exact next steps (in order)

1. **Wire a Supabase project** (migrations → env → Auth settings) — unlocks all ⚠️ items.
2. **Phase 2**: responder registration hardening (real signed file uploads to
   `responder-documents`, qualification review UI, rejection/suspension flows).
3. **Phase 3**: end-to-end GPS + production map (cluster, filters, legend,
   demo-vs-live toggle) against the live backend.
4. **Phase 4**: reporting → verification → dispatch → accept/decline → status
   lifecycle against the live backend.
5. **Phase 5**: notifications + messaging + token tracking polish + CAPTCHA.
6. **Phase 6**: admin analytics, audit viewer, OpenAPI doc.
7. **Phase 7**: security audit, load test, backups, legal review (Law
   No. 91/2025/QH15), then authorised production deploy.
8. **Phase 8**: Expo mobile reusing `/api/v1`.

## Security posture

RLS on every table, server-side re-validation, hashed tracking tokens,
private buckets, private-jittered public GPS, audit-logged decisions/exports.
Known gaps: no CAPTCHA/Redis yet, CSP headers pending (Phase 7), legal review
still required before any public deployment.
