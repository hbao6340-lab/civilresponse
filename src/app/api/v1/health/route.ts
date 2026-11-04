import { env } from "@/lib/env";
import { ok } from "@/lib/api";

/**
 * GET /api/v1/health
 * Diagnostic endpoint: reports whether the *server-side* build has the
 * Supabase integration wired (never exposes key values — only counts).
 * Use it to distinguish "env vars missing" from "browser-side problem".
 */
export async function GET() {
  return ok({
    configured: env.isSupabaseConfigured,
    mode: env.mode,
    hasUrl: Boolean(env.supabaseUrl),
    hasAnonKey: Boolean(env.supabaseAnonKey),
    hasServiceRoleKey: Boolean(env.supabaseServiceRoleKey),
    mapTilesUrl: env.mapTilesUrl,
  });
}
