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

  const supabase = await createClient();
  let incidentId: string | null = null;

  if (admin) {
    const { data, error: insertError } = await admin
      .from("incidents")
      .insert(row)
      .select("id")
      .single();
    if (insertError) return error("Could not record your report.", 500, "db_error");
    incidentId = String(data.id);
  } else {
    const { data, error: insertError } = await supabase.rpc("submit_incident", {
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
    if (typeof data === "string") incidentId = data;
  }

  // Dispatch: create pending assignments for eligible nearby responders and
  // in-app notifications. Best-effort — the report is already recorded.
  if (incidentId) {
    try {
      const dispatchClient = admin ?? supabase;
      await dispatchClient.rpc("dispatch_incident", {
        p_incident_id: incidentId,
        p_latitude: input.latitude,
        p_longitude: input.longitude,
        p_radius_meters: 3000,
        p_max_responders: 10,
      });
    } catch {
      // Dispatch failure must never fail the citizen's submission; the
      // incident stays NEW and can be dispatched later (admin: re-run RPC).
    }
  }

  return created({ publicReference, trackingToken });
}
