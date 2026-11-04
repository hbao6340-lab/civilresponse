# Changelog

All notable changes to CIVIRESPOND are documented here.

## [Unreleased]

### Added
- Phase 1 foundation: Next.js 16 (App Router, Turbopack), TypeScript strict,
  Tailwind v4 design system, MapLibre GL, Supabase SSR wiring.
- Public site: landing, responder map, report, incident tracking, about,
  privacy, terms, safety, become-a-responder, login, auth callback.
- Protected shells: responder (dashboard/profile/verification/incidents/
  settings), admin (dashboard/map/responders/incidents/users/reports/settings).
- Role model + server auth helpers; `proxy.ts` session guard (Next.js 16).
- REST API v1: map, incidents (report/track), GPS (consent-gated),
  responders (register/me/duty/documents), assignments (mine/accept/decline),
  notifications/push, messages, admin (summary/responders/verify/incidents/
  users/exports).
- PostGIS migrations: 17 tables, enums, GiST indexes, triggers, full RLS,
  private storage buckets, and 9 RPC functions (`0001_init.sql`,
  `0002_seed.sql` dev-only).
- Docs: ARCHITECTURE, DATABASE, API, SECURITY, DEPLOYMENT, README,
  PROJECT_STATUS, runnable via env-free dev mode.

### Notes
- No backend credentials present: APIs return `503 not_configured`, map shows
  explicitly labelled demo markers, dev banner is shown. Nothing here implies
  production readiness.
