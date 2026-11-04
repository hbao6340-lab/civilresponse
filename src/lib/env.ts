/**
 * Environment helpers — CIVIRESPOND
 *
 * Next.js 16 note: prefer reading process.env inside Server Components / route
 * handlers, guarded by `connection()` when a value must be read at request time.
 * This module is a thin, typed accessor so server code has a single place to
 * check credentials and degrade safely when they are missing.
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

export const env: EnvShape = {
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
