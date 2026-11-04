import { createClient } from "@/lib/supabase/server";
import { env } from "@/lib/env";
import { ok, forbidden, unauthorized, notConfigured } from "@/lib/api";
import { getSessionUser, isAdmin } from "@/lib/auth";

export async function GET() {
  const user = await getSessionUser();
  if (!user) return unauthorized();
  if (!isAdmin(user)) return forbidden();
  if (!env.isSupabaseConfigured) return notConfigured("Not configured.");

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("incidents")
    .select(
      "id,public_reference,incident_category,status,priority,created_at",
    )
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) return ok({ incidents: [] });

  return ok({
    incidents: (data ?? []).map((i) => ({
      id: String(i.id),
      publicReference: String(i.public_reference),
      category: String(i.incident_category),
      status: String(i.status),
      priority: String(i.priority),
      createdAt: String(i.created_at),
    })),
  });
}
