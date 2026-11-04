# CIVIRESPOND — Deployment

## Environments

| Env | Frontend | Backend |
|---|---|---|
| Local dev | `npm run dev` (Turbopack) | Optional local Supabase (`supabase start`) or empty-backend dev mode |
| Staging | Vercel preview / Docker | Supabase staging project |
| Production | Vercel or Docker + Cloudflare DNS | Supabase managed (PITR) or secured self-hosted PostGIS |

## Local (no backend — works today)

```bash
npm install
cp .env.example .env.local   # leave values empty for dev mode
npm run dev                  # http://localhost:3000
npm run typecheck            # tsc --noEmit
npm run lint                 # eslint .
npm run build                # production build
```

In empty-backend dev mode the app shows a banner, the public map uses
**labelled demo markers**, and API stubs return `503 not_configured`.

## Local (with backend)

1. Create a Supabase project (or `supabase start` locally).
2. Run migrations in order: `0001_init.sql`, then `0002_seed.sql` **only** in
   a demo/dev project (never production).
3. Fill `.env.local` with `NEXT_PUBLIC_SUPABASE_URL`,
   `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`.
4. In the Supabase dashboard: enable email confirmations, set site URL +
   `/auth/callback` redirect, configure MFA for privileged roles.
5. `npm run dev` — create accounts, assign roles in `user_roles`, verify a
   responder via the admin UI, go on duty, and watch GPS + dispatch flow.

## Production checklist (Phase 7 — not done in Phase 1)

- [ ] Legal review: Law No. 91/2025/QH15 + DPIA + threat-model sign-off
- [ ] Turnstile CAPTCHA keys; move rate limits to Redis/Upstash
- [ ] Security headers (CSP, HSTS) in `next.config`; WAF/CDN via Cloudflare
- [ ] VAPID keys for Web Push; Firebase credentials if mobile is in scope
- [ ] PITR backups + restore drill; uptime/alerting; log retention
- [ ] Load test GPS + dispatch endpoints; pg_cron purge of expired locations
- [ ] Delete demo seed data; rotate all keys; verify RLS on the live project

**Never deploy to production without explicit authorisation.**
