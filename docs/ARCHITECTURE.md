# CIVIRESPOND — Architecture

**Community First Responder Network** · Ho Chi Minh City, Vietnam
*Independent community platform — not an official emergency dispatch system.*

## 1. At a glance

```
┌──────────────────────────────┐      ┌─────────────────────────────┐
│  Browser (Next.js App Router)│      │  Supabase (PostgreSQL+PostGIS)│
│  • Public pages (no login)   │      │  • Auth (email confirm)     │
│  • Responder / Admin shells  │─────▶│  • RLS on every table       │
│  • MapLibre GL + OSM tiles   │ HTTP │  • Realtime publication     │
│  • watchPosition() GPS       │      │  • Storage (private buckets)│
└──────────────────────────────┘      └─────────────────────────────┘
              │                                  ▲
              │  Next.js route handlers (/api/v1)│
              └──────────────────────────────────┘
         Server re-validates EVERY request:
         auth → role → verification → consent → bounds
```

## 2. Stack

| Layer | Choice |
|---|---|
| Framework | Next.js 16 (App Router), TypeScript strict, React 19 |
| Styling | Tailwind CSS v4 (+ shadcn/ui-style wrappers in `src/components/ui`) |
| Forms/validation | React Hook Form + Zod (server and client) |
| Data fetching | TanStack Query (where appropriate) |
| Backend | Supabase: PostgreSQL + PostGIS, Auth, Realtime, Storage |
| Map | MapLibre GL JS, OpenStreetMap tiles (configurable) |
| Authz | Supabase RLS + `user_roles` + server checks (never trust client roles) |
| Notifications | Web Push (VAPID) now; FCM architecture table-ready for mobile |
| Deployment | Vercel or Docker; Supabase managed or self-hosted PostGIS |

Server-side Next.js route handlers live under `/api/v1/...` and return
structured JSON `{ success, data } | { success: false, error }`.

## 3. Next.js 16 specifics (v16.4.5 installed)

- `cookies()`, `headers()`, `params`, `searchParams` are **async** — always awaited.
- Route protection uses **`proxy.ts`** (formerly `middleware`), Node runtime.
- Turbopack is the default bundler for `dev` and `build`.
- `next lint` is removed — linting is via the ESLint CLI (`eslint .`).
- React Compiler is opt-in (`reactCompiler: true`). Cache Components/PPR are
  intentionally **off** for this foundation build: the app is dynamic-first
  (auth, realtime, GPS) and enabling caching now would surface build errors
  rather than value. Revisit in Phase 7.
- Async typed route props use `Promise<...>` (see `src/app/incident/[reference]/page.tsx`).

## 4. Roles & access model

```
citizen ── public map, report, track (token), message (own incident)
responder ── profile, verification, duty mode, GPS, accept/decline, messages
verification_officer ── review applications/documents, approve/reject/suspend
administrator ── + responders, incidents, users, reports/exports, audit
super_admin ── + global config, integrations, security settings
```

Enforcement is three-deep: Proxy (session presence) → Layout (role) → API +
RLS (definer-checked RPC). Precise GPS, identity documents, phone numbers,
and incident detail are never reachable anonymously.

## 5. GPS & privacy pipeline

1. Only a **verified** responder, **on duty**, with **location_sharing**
   consent, whose browser granted permission, runs `watchPosition()`.
2. Each tick posts to `POST /api/v1/gps/updates`. The server re-checks all
   four gates plus HCMC bounds, then calls `upsert_responder_location`
   (prunes old rows, sets a 2-minute expiry).
3. Moving cadence ≈ 7.5s; stationary ≈ 25s (movement threshold 25m).
4. `find_nearby_responders` / `public_responder_markers` exclude stale rows
   (`recorded_at` ≥ 2 min ago **and** unexpired). The public map applies a
   ~500m jitter in the API layer — coordinates are approximate by design.
5. No background tracking is claimed: closing/suspending the browser stops
   sharing. The API contract is shaped for a future native mobile client.

## 6. Dispatch lifecycle

`NEW → PENDING_REVIEW → VERIFIED → NOTIFYING → ACCEPTED → EN_ROUTE →
ON_SCENE → RESOLVED / CANCELLED / FALSE_REPORT`

Reports start at `NEW`; verification is a separate state (a responder
accepting does **not** verify a report). Assignments use `set_assignment_action`
(transactional RPC). Multi-responder coordination is supported by design
(unique constraint per incident+responder).

## 7. What is *not* in Phase 1

Auth is wired but the backend is optional: with no env vars the app builds and
runs in a clearly-bannered "development mode" (public pages + labelled demo
map + safe 503 API stubs). Wiring a real Supabase project activates the full
path. This is deliberate: it proves the app boots and type-checks with zero
credentials, and every failure mode degrades safely.

## 8. Future mobile

A React Native / Expo client will reuse these exact `/api/v1` endpoints and
tables — no second backend. `push_subscriptions.platform` already
distinguishes `web|android|ios`.
