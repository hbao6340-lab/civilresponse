"use client";

import { createBrowserClient } from "@supabase/ssr";
import { env } from "@/lib/env";

/**
 * Browser-side Supabase client (anon key only).
 * Never import this from server components — use server.ts for RSC/route work.
 *
 * Each call reads the *current* environment lazily so this code path is
 * immune to import order / hydration timing.
 */
export function createClient() {
  const url = env.supabaseUrl;
  const key = env.supabaseAnonKey;
  if (!url || !key) {
    throw new Error(
      "Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.",
    );
  }
  // Guard the most common copy/paste accidents explicitly so the error
  // names the real cause instead of a generic message:
  if (!url.startsWith("https://") || !url.includes(".supabase.co")) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL looks wrong: it must be the API URL (https://<ref>.supabase.co) from Supabase → Settings → API Keys → Project URL.",
    );
  }
  return createBrowserClient(url, key);
}
