# CIVIRESPOND — Community First Responder Network

*Connecting Communities. Accelerating Emergency Response.*

An independent, community-operated platform connecting **verified volunteer
first responders** with people who need help across **Ho Chi Minh City** —
built with Next.js, TypeScript and Supabase (PostgreSQL + PostGIS).

> **Not an official emergency service.** In a life-threatening emergency call
> police **113**, fire **114**, or medical **115** first — then use CIVIRESPOND
> to coordinate community help.

## What it provides

- Interactive citywide responder map (MapLibre + OSM, privacy-protected approx.)
- Verified responder registration with identity/qualification review
- Consent-based live GPS (`watchPosition`, duty-gated, stale-expiring)
- PostGIS nearby-responder discovery + incident dispatch lifecycle
- Public emergency reporting with secure trackable references
- Role-based access (citizen · responder · verification officer · admin · super-admin)
- Secure incident messaging, Web Push (FCM schema-ready), admin dashboards

## Quick start (no backend needed)

```bash
npm install
cp .env.example .env.local
npm run dev        # http://localhost:3000
```

Empty-backend dev mode: public pages, labelled demo map markers, safe API
stubs (`503 not_configured`). A banner notes the mode.

## Quick start (with backend)

1. Create a Supabase project (PostgreSQL + PostGIS template).
2. Run `supabase/migrations/0001_init.sql` (and `0002_seed.sql` in dev only).
3. Set the three Supabase env vars in `.env.local` (see `.env.example`).
4. Configure Auth: email confirmations, site URL, `/auth/callback` redirect,
   MFA for privileged roles.
5. Sign up, assign roles in `user_roles`, verify a responder, go on duty.

## Checks

```bash
npm run typecheck   # tsc --noEmit
npm run lint        # eslint .
npm run build       # Turbopack production build
```

## Docs

- `docs/ARCHITECTURE.md` — system design & Next.js 16 notes
- `docs/DATABASE.md` — schema, RLS, functions, retention
- `docs/API.md` — `/api/v1` reference
- `docs/SECURITY.md` — threat model, privacy, compliance
- `docs/DEPLOYMENT.md` — local → production checklist
- `PROJECT_STATUS.md`, `CHANGELOG.md` — living status

## Phases

1. ✅ Foundation, auth, roles, migrations, public site (this build)
2. Responder registration & verification hardening
3. Live GPS end-to-end + map productionisation
4. Reporting & dispatch workflows
5. Notifications, messaging, tracking
6. Admin analytics & reporting
7. Security audit, load test, production deploy
8. Native mobile readiness (Expo reusing `/api/v1`)

See `PROJECT_STATUS.md` for the current phase and honest status of every
feature (real vs. placeholder vs. simulated).
