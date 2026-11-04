import { env } from "@/lib/env";
import { ok } from "@/lib/api";

/**
 * GET /api/v1/health
 * Diagnostic endpoint: reports whether the *server-side* build has the
 * Supabase integration wired. Also reports **shape only** (host suffix + key
 * length) for the browser-visible values so a server-vs-browser mismatch
 * can be located without ever printing a secret.
 */
export async function GET() {
  const url = env.supabaseUrl ?? "";
  const anon = env.supabaseAnonKey ?? "";
  let hostSuffix = "";
  try {
    hostSuffix = new URL(url).host.replace(/^[^.]+\./, "");
  } catch {
    hostSuffix = "";
  }
  const service = env.supabaseServiceRoleKey ?? "";
  return ok({
    configured: env.isSupabaseConfigured,
    mode: env.mode,
    hasUrl: Boolean(url),
    hasAnonKey: Boolean(anon),
    hasServiceRoleKey: Boolean(service),
    urlHostSuffix: hostSuffix, // e.g. "supabase.co"
    anonKeyLength: anon.length,
    serviceKeyLength: service.length,
    urlEndsWithSlash: url.endsWith("/"),
    anonIsServiceRole: Boolean(service) && anon === service,
    mapTilesUrl: env.mapTilesUrl,
  });
}
