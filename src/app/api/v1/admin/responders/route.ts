import { createClient } from "@/lib/supabase/server";
import { env } from "@/lib/env";
import { ok, forbidden, unauthorized, notConfigured } from "@/lib/api";
import { getSessionUser, isAdmin, canVerify } from "@/lib/auth";

export async function GET() {
  const user = await getSessionUser();
  if (!user) return unauthorized();
  if (!isAdmin(user) && !canVerify(user)) return forbidden();
  if (!env.isSupabaseConfigured) return notConfigured("Not configured.");

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("responders")
    .select(
      "id,display_name,verification_status,availability_status,duty_mode,created_at",
    )
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) return ok({ responders: [] });

  return ok({
    responders: (data ?? []).map((r) => ({
      id: String(r.id),
      displayName: String(r.display_name ?? "Responder"),
      verificationStatus: String(r.verification_status),
      availabilityStatus: String(r.availability_status),
      dutyMode: Boolean(r.duty_mode),
    })),
  });
}
