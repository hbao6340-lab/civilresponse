import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { env } from "@/lib/env";
import { ok, error, unauthorized, notConfigured, validationError } from "@/lib/api";
import { getSessionUser } from "@/lib/auth";

export async function GET() {
  const user = await getSessionUser();
  if (!user) return unauthorized();
  if (!env.isSupabaseConfigured) return notConfigured("Not configured.");

  const supabase = await createClient();
  const { data } = await supabase
    .from("responders")
    .select(
      "id,verification_status,availability_status,duty_mode,location_sharing_enabled,public_visibility,display_name",
    )
    .eq("user_id", user.id)
    .single();
  if (!data) return error("Responder profile not found.", 404, "not_found");

  return ok({
    verificationStatus: data.verification_status,
    dutyMode: data.duty_mode,
    availabilityStatus: data.availability_status,
    locationSharingEnabled: data.location_sharing_enabled,
    publicVisibility: data.public_visibility,
    displayName: data.display_name,
  });
}

const updateSchema = z.object({
  displayName: z.string().trim().min(2).max(120).optional(),
  bio: z.string().trim().max(500).optional(),
  operatingArea: z.string().trim().max(200).optional(),
});

export async function PUT(request: Request) {
  const user = await getSessionUser();
  if (!user) return unauthorized();
  if (!env.isSupabaseConfigured) return notConfigured("Not configured.");

  const parsed = updateSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return validationError(parsed.error);

  const supabase = await createClient();
  const { error: err } = await supabase
    .from("responders")
    .update({
      display_name: parsed.data.displayName,
      bio: parsed.data.bio,
      operating_area: parsed.data.operatingArea,
    })
    .eq("user_id", user.id);
  if (err) return error("Could not update profile.", 500, "db_error");
  return ok({ updated: true });
}
