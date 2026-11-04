# CIVIRESPOND — Security & Privacy

## Principles

1. **Least privilege, enforced twice.** RLS in PostgreSQL is the backstop;
   every Next.js route handler re-checks auth → role → verification → consent
   before touching data. Frontend roles are never trusted.
2. **Privacy by design.** Exact GPS, identity documents, phone numbers,
   incident media, and incident detail never reach anonymous or public
   surfaces. The public map gets jittered approximations only.
3. **Consent is a first-class record.** `user_consents` + `set_consent` RPC
   capture grant/withdrawal with policy versions; GPS requires both
   `duty_mode` and `location_sharing_enabled`.
4. **No secrets in source.** Service-role key is a server-only env var;
   Vercel/Supabase dashboards hold all credentials. `.env.local` is git-ignored.
5. **Everything sensitive is audit-logged.** Verification decisions, CSV
   exports, and (planned) settings changes write `audit_logs`.

## Controls implemented in Phase 1

| Control | Where |
|---|---|
| RLS on all 17 tables | `supabase/migrations/0001_init.sql` |
| Zod request validation | `src/lib/validation.ts`, every route |
| Rate limiting (report, register, GPS, messages) | `src/lib/rate-limit.ts` (in-memory; Redis/Upstash in prod) |
| Hash-only tracking tokens (SHA-256) | `src/lib/incident-service.ts` |
| HCMC bounds + coordinate validation | `src/lib/validation.ts`, RPC functions |
| Private storage + signed URLs | buckets + policies in migration |
| MFA policy for privileged roles | documented; enforced via Supabase Auth MFA settings for verification/admin roles |
| CSP / security headers | **TODO Phase 7** — `next.config` headers + monitoring |
| CAPTCHA (Turnstile) | schema slot present; keys wired in Phase 5 |

## Threat model (summary)

| Threat | Mitigation |
|---|---|
| Stalking via precise GPS | public feed jittered & opt-in; exact rows owner/admin RLS only; 2-min expiry; stale rows excluded from search |
| Fake responders | verification gate before duty/alerts/map; suspension revokes duty |
| Spam/false reports | rate limits, CAPTCHA (pending), `FALSE_REPORT` lifecycle, audit |
| PII/data breach | private buckets, signed URLs, least-privilege RLS, no PII in public responses |
| Token leakage (tracking link) | token is a secret; only hash stored; rotate via re-issue |
| Privilege escalation | roles server-side + RLS; service-role never browser-exposed |
| Unsafe dispatch | qualification-aware ranking; dangerous incidents never auto-assigned to unqualified volunteers (policy in docs/API + dispatch logic) |

## Privacy & compliance notes

- Consent-based collection with defined retention: exact location history is
  ephemeral (latest row only, 2-minute expiry); incident/verification records
  follow a published schedule and admin deletion workflows (Phase 6).
- **Before any public deployment**, legal review is required against
  Vietnamese **Law No. 91/2025/QH15** (personal-data protection) and other
  applicable regulations, plus a full Data Protection Impact Assessment.
  This repository's policy text is a summary, not legal advice.
- Browser GPS is foreground-only: the platform does **not** claim background
  tracking; the future native app will use OS-level background permissions.

## Incident response (operational plan, Phase 7)

Backup (Supabase PITR) + tested restore, uptime alerting (Vercel/Supabase
health), security-header/CSP hardening, load testing of GPS endpoints, and a
documented breach-notification runbook are deliverables of Phase 7 — not
Phase 1. The current build states this explicitly rather than implying
production readiness.
