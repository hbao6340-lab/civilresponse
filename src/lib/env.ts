/**
 * Environment helpers — CIVIRESPOND
 *
 * Next.js 16 note: prefer reading process.env inside Server Components / route
 * handlers, guarded by `connection()` when a value must be read at request time.
 * This module is a thin, typed accessor so server code has a single place to
 * check credentials and degrade safely when they are missing.
 *
 * IMPORTANT — static access only:
 * Next.js/Turbopack inlines `process.env.NEXT_PUBLIC_*` at BUILD TIME by
 * statically replacing direct member access such as
 * `process.env.NEXT_PUBLIC_SUPABASE_URL`.
 * Dynamic access via `process.env[name]` is NOT replaced in client bundles:
 * it falls through to a `process` shim (a timer polyfill) whose `env` is
 * `undefined`, so every browser read returns `null` and sign-in always fails
 * while the server (real Node runtime) reads the vars correctly. That was the
 * production "Supabase is not configured" sign-in bug.
 *
 * Therefore: never use `process.env[name]` for NEXT_PUBLIC_* values.
 * Read each value via the statically-written expressions below.
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

function clean(v: string | undefined): string | null {
  if (v === undefined) return null;
  const trimmed = v.trim();
  return trimmed === "" ? null : trimmed;
}

const NODE_ENV = (process.env.NODE_ENV ?? "development") as Mode;

function snapshot(): EnvShape {
  // Every NEXT_PUBLIC_* access below is a literal property access so
  // Next.js can inline it into the client bundle at build time.
  const supabaseUrl = clean(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const supabaseAnonKey = clean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  return {
    mode: NODE_ENV,
    siteUrl: clean(process.env.NEXT_PUBLIC_SITE_URL) ?? "http://localhost:3000",
    supabaseUrl,
    supabaseAnonKey,
    supabaseServiceRoleKey: clean(process.env.SUPABASE_SERVICE_ROLE_KEY),
    isSupabaseConfigured: Boolean(supabaseUrl && supabaseAnonKey),
    mapTilesUrl:
      clean(process.env.NEXT_PUBLIC_MAP_TILES_URL) ??
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
  // NOTE: `name` is only used for the error message here; the actual reads
  // for known keys are the static expressions in snapshot() above.
  const v = clean((process.env as Record<string, string | undefined>)[name]);
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
