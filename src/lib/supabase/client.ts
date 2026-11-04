"use client";

import { createBrowserClient } from "@supabase/ssr";

/**
 * Browser-side Supabase client (anon key only).
 * Never import this from server components — use server.ts for RSC/route work.
 *
 * NEXT_PUBLIC_* values are read with STATIC literal access here so
 * Next.js/Turbopack inlines them at build time. Dynamic access
 * (`process.env[name]`) is not inlined and falls back to a shim whose
 * `env` is undefined in the browser.
 */
export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
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
