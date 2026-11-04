# CIVIRESPOND — API

Versioned REST under `/api/v1/`. Every response is structured JSON:

```jsonc
{ "success": true,  "data": { /* … */ } }
{ "success": false, "error": { "message": "…", "code": "validation_error", "details": {…} } }
```

All request bodies are validated with Zod server-side. Errors:
`400 validation_error`, `401 unauthorized`, `403 forbidden|consent_required`,
`404 not_found`, `429 rate_limited`, `500 db_error|internal_error`,
`503 not_configured` (backend absent — never a 500).

## Public (no auth)

| Method | Route | Description |
|---|---|---|
| `GET` | `/map/responders` | Privacy-jittered markers of eligible responders; `demo: true` when backend absent |
| `POST` | `/incidents` | Citizen report (rate-limited 5/min/IP). Returns `{ publicReference, trackingToken }` — token shown **once** |
| `GET` | `/incidents/{reference}?t=…` | Secure tracking (token hash OR authorised session) |

## Authenticated (responder)

| Method | Route | Gates |
|---|---|---|
| `POST` | `/gps/updates` | verified + duty + consent, rate-limited, bounds-checked |
| `PUT` | `/responders/duty` | duty, availability, `location_sharing`, `public_visibility` (consent RPC) |
| `GET/PUT` | `/responders/me` | own profile |
| `POST` | `/responders/documents` | records a document submission (signed-upload flow lands in Phase 2) |
| `GET` | `/assignments/mine` | own assignments |
| `POST` | `/assignments/{id}/accept|decline` | verified responders, transactional RPC |
| `POST` | `/notifications/push` | Web Push subscription (FCM schema-ready) |
| `POST` | `/messages` | conversation-participant check + rate limit |

## Registration (public entry, verified by email)

`POST /responders/register` — creates a `pending` responder; user binding
completes via Supabase Auth email confirmation.

## Administration (role-checked server-side)

| Method | Route |
|---|---|
| `GET` | `/admin/summary` — counts RPC |
| `GET` | `/admin/responders` |
| `POST` | `/admin/responders/{id}/verify` — `verified|rejected|suspended`, audit-logged |
| `GET` | `/admin/incidents` |
| `GET` | `/admin/users` |
| `GET` | `/admin/exports/{incidents|responders|assignments|audit}` — CSV, audit-logged |

## OpenAPI

A hand-written OpenAPI document is planned for Phase 6 alongside the
analytics surface. Until then, this file + `src/lib/validation.ts` (the Zod
contracts) are the canonical API reference.
