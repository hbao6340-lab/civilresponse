import { z } from "zod";
import { locationUpdateSchema } from "@/lib/validation";
import { createClient } from "@/lib/supabase/server";
import { env } from "@/lib/env";
import { ok, error, unauthorized, notConfigured } from "@/lib/api";
import { getSessionUser } from "@/lib/auth";
import { rateLimited } from "@/lib/rate-limit";

/**
 * POST /api/v1/gps/updates
 * Consent-gated live GPS. Server re-validates: auth, verification, duty mode,
 * location-sharing consent, HCMC bounds, and freshness. Exact coordinates
 * are stored server-side only and expire automatically.
 */
export async function POST(request: Request) {
  if (!env.isSupabaseConfigured) {
    return notConfigured("GPS updates require a configured backend.");
  }
  const user = await getSessionUser();
  if (!user) return unauthorized();

  if (rateLimited(`gps:${user.id}`, 120, 60_000)) {
    return error("Too frequent.", 429, "rate_limited");
  }

  const body = await request.json().catch(() => null);
  const parsed = locationUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return error("Invalid location.", 400, "validation_error");
  }
  const input = parsed.data;

  const supabase = await createClient();
  const { data } = await supabase
    .from("responders")
    .select("id,verification_status,duty_mode,location_sharing_enabled")
    .eq("user_id", user.id)
    .single();

  if (!data) return error("Responder profile not found.", 404, "not_found");
  if (data.verification_status !== "verified") {
    return error("Responder is not verified.", 403, "forbidden");
  }
  if (!data.duty_mode) {
    return error("Duty mode is off.", 403, "forbidden");
  }
  if (!data.location_sharing_enabled) {
    return error("Location sharing consent is required.", 403, "consent_required");
  }

  const { error: rpcError } = await supabase.rpc("upsert_responder_location", {
    p_responder_id: data.id,
    p_latitude: input.latitude,
    p_longitude: input.longitude,
    p_accuracy_meters: input.accuracyMeters ?? null,
    p_heading: input.heading ?? null,
    p_speed: input.speedMetersPerSecond ?? null,
  });
  if (rpcError) return error("Could not store location.", 500, "db_error");

  return ok({ stored: true });
}

export const _schema = z.object({});
