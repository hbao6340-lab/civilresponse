import { createClient } from "@/lib/supabase/server";
import { env } from "@/lib/env";
import { ok, error, unauthorized, notConfigured, validationError } from "@/lib/api";
import { getSessionUser } from "@/lib/auth";
import { dutyModeSchema } from "@/lib/validation";

/**
 * PUT /api/v1/responders/duty
 * Duty mode, availability, location-sharing and public-visibility controls.
 * Server re-validates verification + consent for location sharing.
 */
export async function PUT(request: Request) {
  const user = await getSessionUser();
  if (!user) return unauthorized();
  if (!env.isSupabaseConfigured) return notConfigured("Not configured.");

  const parsed = dutyModeSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return validationError(parsed.error);
  const input = parsed.data;

  const supabase = await createClient();
  const { data: responder } = await supabase
    .from("responders")
    .select("id,verification_status")
    .eq("user_id", user.id)
    .single();
  if (!responder) return error("Responder profile not found.", 404, "not_found");

  if (input.dutyMode && responder.verification_status !== "verified") {
    return error("Only verified responders can go on duty.", 403, "forbidden");
  }
  if (input.locationSharingEnabled && responder.verification_status !== "verified") {
    return error("Verification is required before location sharing.", 403, "forbidden");
  }

  const patch: Record<string, unknown> = {};
  if (input.dutyMode !== undefined) patch.duty_mode = input.dutyMode;
  if (input.availabilityStatus) patch.availability_status = input.availabilityStatus;
  if (input.locationSharingEnabled !== undefined) {
    patch.location_sharing_enabled = input.locationSharingEnabled;
  }
  if (input.publicVisibility !== undefined) {
    patch.public_visibility = input.publicVisibility;
  }

  const { error: err } = await supabase
    .from("responders")
    .update(patch)
    .eq("id", responder.id);
  if (err) return error("Could not update duty settings.", 500, "db_error");

  // Record consent transitions.
  if (input.locationSharingEnabled !== undefined) {
    await supabase.rpc("set_consent", {
      p_consent_type: "location_sharing",
      p_policy_version: "1.0",
      p_granted: input.locationSharingEnabled,
    });
  }
  if (input.publicVisibility !== undefined) {
    await supabase.rpc("set_consent", {
      p_consent_type: "public_map_visibility",
      p_policy_version: "1.0",
      p_granted: input.publicVisibility,
    });
  }

  return ok({ updated: true });
}
