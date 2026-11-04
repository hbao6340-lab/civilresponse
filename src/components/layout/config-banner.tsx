import { env } from "@/lib/env";

/**
 * Non-blocking notice shown only when the backend is not configured.
 * Suppressed in production builds that expect a live backend (deployments must
 * set env vars; this banner must never appear in a public production rollout).
 */
export function ConfigBanner() {
  if (env.isSupabaseConfigured) return null;
  if (process.env.NODE_ENV === "production") return null;
  return (
    <p className="bg-amber-50 px-4 py-2 text-center text-xs font-medium text-amber-800">
      Development mode — backend not configured. Authentication, GPS, incident
      reporting and realtime are disabled. See README.md “Running locally”.
    </p>
  );
}
