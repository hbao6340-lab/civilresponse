import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { env } from "@/lib/env";

/**
 * Server-side Supabase client (RSC, route handlers, actions).
 * Next.js 16: cookies() must be awaited.
 */
export async function createClient() {
  if (!env.isSupabaseConfigured) {
    throw new Error(
      "Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.",
    );
  }
  const cookieStore = await cookies();
  return createServerClient(env.supabaseUrl!, env.supabaseAnonKey!, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        for (const { name, value, options } of cookiesToSet) {
          cookieStore.set(name, value, options);
        }
      },
    },
  });
}

/**
 * Privileged client using the service-role key. NEVER expose to the browser.
 * Returns null when not configured so callers can return a safe 503.
 */
export async function createAdminClient() {
  if (!env.isSupabaseConfigured || !env.supabaseServiceRoleKey) return null;
  const { createClient } = await import("@supabase/supabase-js");
  return createClient(env.supabaseUrl!, env.supabaseServiceRoleKey!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
