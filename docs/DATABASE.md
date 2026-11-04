# CIVIRESPOND — Database

PostgreSQL + PostGIS on Supabase. Migrations are plain SQL under
`supabase/migrations/` and are the source of truth — never edit a table by
hand without a migration.

## Migrations

| File | Contents |
|---|---|
| `0001_init.sql` | Extensions, 7 enums, **17 tables**, indexes (incl. GiST on `geography`), triggers, RLS policies, private storage buckets, and all RPC functions |
| `0002_seed.sql` | **Development only**: 5 HCMC operating areas. Never run in production. |

## Tables (17)

`profiles`, `user_roles`, `responders`, `responder_qualifications`,
`responder_documents`, `responder_locations`, `incidents`, `incident_media`,
`incident_assignments`, `incident_events`, `responder_notifications`,
`conversations`, `messages`, `operating_areas`, `push_subscriptions`,
`audit_logs`, `user_consents`.

Key columns per the master spec: responders carry verification/duty/consent
state; locations are `geography(POINT, 4326)` with accuracy/heading/speed and
`expires_at`; incidents carry `public_reference`, category, `access_token_hash`
(only the SHA-256 of the citizen's tracking token is stored), status,
priority, and lifecycle timestamps.

## RLS & security

- **Every table has RLS enabled.** Policies are least-privilege:
  - respondents/qualifications/documents: self + verification/staff
  - locations: owner + admin only (never public)
  - incidents: reporter + assigned responders + admin (select); staff (update)
  - conversations/messages: participants only
  - push: own only · audit: admin read · consents: own + admin
  - operating_areas: public read, admin write
- RPC functions are `security definer` with `set search_path = public` —
  each re-checks authority (`can_verify`, `is_admin`) before acting.
- Storage buckets (`responder-documents`, `incident-media`) are **private**;
  files are reached via server-issued signed URLs only.

## Geographic queries

`find_nearby_responders(lat, lng, radius_m, category)` returns eligible
responders only — verified, on duty, sharing, available/busy, fresh GPS
(≤ 2 minutes old and unexpired) — ranked by distance, with verified
qualification titles. Radius is caller-configurable (1k/3k/5k/10k presets).
`public_responder_markers()` returns the same privacy-protected set (public
visibility opt-in required); the API applies a ~500m jitter on top.

## Retention

- Exact locations: only the latest row per responder survives
  (`upsert_responder_location` prunes first); expiry = 2 minutes. A scheduled
  purge job should delete expired rows (Supabase cron / pg_cron).
- Incidents, assignments, events, consents, audit: retained per the policy in
  `docs/SECURITY.md`; deletion workflows are an admin/Phase 6 concern.

## Privileges

Browser clients use the **anon key** (RLS-bound). Server work uses either
the user-session client or the **service-role key** (`createAdminClient()`,
server-only, never `NEXT_PUBLIC_`).
