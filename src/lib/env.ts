/**
 * Environment helpers — CIVIRESPOND
 *
 * Next.js 16 note: prefer reading process.env inside Server Components / route
 * handlers, guarded by `connection()` when a value must be read at request time.
 * This module is a thin, typed accessor so server code has a single place to
 * check credentials and degrade safely when they are missing.
 *
 * Each value is read lazily (function call, not module top-level) so the
 * client bundle sees whatever environment Next inlines at build time —
 * evaluating once at import would freeze first-load emptiness on first
 * hydration (a source of the "Backend not configured" sign-in dead-end).
 */

type Mode = "production" | "staging" | "development";

export interface EnvShape {
  mode: Mode;
  siteUrl: string;
  supabaseUrl: string | null;
  supabaseAnonKey: string | null;
  supabaseServiceRoleKey: string | null;
  isSupabaseConfigured: boolean;
  mapTilesUrl: string;
}

function read(name: string): string | null {
  const v = process.env[name];
  if (v === undefined) return null;
  const trimmed = v.trim();
  return trimmed === "" ? null : trimmed;
}

const NODE_ENV = (process.env.NODE_ENV ?? "development") as Mode;

function snapshot(): EnvShape {
  return {
    mode: NODE_ENV,
    siteUrl: read("NEXT_PUBLIC_SITE_URL") ?? "http://localhost:3000",
    supabaseUrl: read("NEXT_PUBLIC_SUPABASE_URL"),
    supabaseAnonKey: read("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
    supabaseServiceRoleKey: read("SUPABASE_SERVICE_ROLE_KEY"),
    isSupabaseConfigured: Boolean(
      read("NEXT_PUBLIC_SUPABASE_URL") && read("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
    ),
    mapTilesUrl:
      read("NEXT_PUBLIC_MAP_TILES_URL") ??
      "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
  };
}

/**
 * Lazily evaluated env. `env.isSupabaseConfigured` and friends are getters,
 * so every read reflects the *current* build-time environment — no frozen
 * first-import state, and no code path depends on import order.
 */
export const env: EnvShape = new Proxy({} as EnvShape, {
  get(_target, prop: keyof EnvShape) {
    return snapshot()[prop];
  },
}) as EnvShape;

export function requireEnv(name: string): string {
  const v = read(name);
  if (!v) throw new Error(`Missing required environment variable: ${name}`);
  return v;
}

/** Warn (once per process) when the app runs without a backend configured. */
let warned = false;
export function warnIfUnconfigured(): void {
  if (!warned && !env.isSupabaseConfigured) {
    warned = true;
    console.warn(
      "[civirespond] Supabase is not configured. Auth, GPS, incidents, and realtime are disabled; the public site and placeholder API responses remain available.",
    );
  }
}
