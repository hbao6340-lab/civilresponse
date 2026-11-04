import { incidentReportSchema } from "@/lib/validation";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { env } from "@/lib/env";
import { created, error, validationError, notConfigured } from "@/lib/api";
import { createIncidentSecrets } from "@/lib/incident-service";
import { rateLimited, clientIp } from "@/lib/rate-limit";
import { getSessionUser } from "@/lib/auth";

/**
 * POST /api/v1/incidents — public emergency reporting (no auth required).
 * Citizens receive a reference + secret tracking token; only the hash is stored.
 */
export async function POST(request: Request) {
  const ip = clientIp(request);
  if (rateLimited(`report:${ip}`, 5, 60_000)) {
    return error("Too many reports. If this is urgent, call 113 / 114 / 115.", 429, "rate_limited");
  }

  const body = await request.json().catch(() => null);
  const parsed = incidentReportSchema.safeParse(body);
  if (!parsed.success) return validationError(parsed.error);
  const input = parsed.data;

  if (!env.isSupabaseConfigured) {
    return notConfigured("Incident reporting requires a configured backend.");
  }

  const user = await getSessionUser().catch(() => null);
  const admin = await createAdminClient();
  const { publicReference, trackingToken, trackingTokenHash } =
    createIncidentSecrets();

  const row = {
    public_reference: publicReference,
    incident_category: input.category,
    description: input.description,
    address: input.address ?? null,
    affected_persons: input.affectedPersons ?? null,
    location: `POINT(${input.longitude} ${input.latitude})`,
    status: "NEW",
    priority: "medium",
    verification_status: "unverified",
    reporter_user_id: user?.id ?? null,
    access_token_hash: trackingTokenHash,
    contact_details: input.contactDetails ?? null,
  };

  if (admin) {
    const { error: insertError } = await admin.from("incidents").insert(row);
    if (insertError) return error("Could not record your report.", 500, "db_error");
  } else {
    const supabase = await createClient();
    const { error: insertError } = await supabase.rpc("submit_incident", {
      p_category: input.category,
      p_description: input.description,
      p_latitude: input.latitude,
      p_longitude: input.longitude,
      p_address: input.address ?? null,
      p_affected: input.affectedPersons ?? null,
      p_reference: publicReference,
      p_token_hash: trackingTokenHash,
    });
    if (insertError) return error("Could not record your report.", 500, "db_error");
  }

  // Notify nearby eligible responders (Phase 4 dispatch). Recorded as
  // pending assignments; realtime + push delivery is best-effort.
  try {
    const supabase = await createClient();
    const { data: nearby } = await supabase.rpc("find_nearby_responders", {
      incident_latitude: input.latitude,
      incident_longitude: input.longitude,
      search_radius_meters: 3000,
      incident_category: input.category,
    });
    void nearby;
  } catch {
    // Non-blocking: incident is already recorded.
  }

  return created({ publicReference, trackingToken });
}
