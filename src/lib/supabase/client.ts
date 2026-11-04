"use client";

import { createBrowserClient } from "@supabase/ssr";
import { env } from "@/lib/env";

/**
 * Browser-side Supabase client (anon key only).
 * Never import this from server components — use server.ts for RSC/route work.
 */
export function createClient() {
  // Lazy read: the client bundle may hydrate before Next.js inlines env on
  // first load, so a *fresh* read on every call is the only reliable check.
  if (!env.isSupabaseConfigured) {
    throw new Error(
      "Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.",
    );
  }
  return createBrowserClient(env.supabaseUrl!, env.supabaseAnonKey!);
}
