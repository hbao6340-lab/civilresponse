import { createClient } from "@/lib/supabase/server";
import { env } from "@/lib/env";
import { ok, unauthorized, notConfigured } from "@/lib/api";
import { getSessionUser } from "@/lib/auth";

export async function GET() {
  const user = await getSessionUser();
  if (!user) return unauthorized();
  if (!env.isSupabaseConfigured) return notConfigured("Not configured.");

  const supabase = await createClient();
  const { data } = await supabase
    .from("incident_assignments")
    .select(
      "id,incident_id,assignment_status,notified_at,created_at,incidents(public_reference,incident_category,status)",
    )
    .eq("responder_id", (await supabase.from("responders").select("id").eq("user_id", user.id).single()).data?.id)
    .order("created_at", { ascending: false })
    .limit(50);

  const assignments = (data ?? []).map((a) => {
    const inc = (a.incidents ?? {}) as {
      public_reference?: string;
      incident_category?: string;
      status?: string;
    };
    return {
      id: String(a.id),
      incidentId: String(a.incident_id),
      publicReference: inc.public_reference ?? "",
      category: inc.incident_category ?? "other",
      status: inc.status ?? "NEW",
      assignmentStatus: String(a.assignment_status),
      assignedAt: String(a.notified_at ?? a.created_at),
    };
  });

  return ok({ assignments });
}
