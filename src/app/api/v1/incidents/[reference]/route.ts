import { createClient } from "@/lib/supabase/server";
import { env } from "@/lib/env";
import { ok, error, notConfigured } from "@/lib/api";
import { sha256 } from "@/lib/incident-service";
import { getSessionUser } from "@/lib/auth";

/**
 * GET /api/v1/incidents/[reference]
 * Requires the secret tracking token (?t=...) or an authorised session.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ reference: string }> },
) {
  const { reference } = await params;
  const token = new URL(request.url).searchParams.get("t");
  const user = await getSessionUser().catch(() => null);

  if (!env.isSupabaseConfigured) {
    return notConfigured("Incident tracking requires a configured backend.");
  }
  if (!token && !user) {
    return error("A tracking token is required.", 401, "unauthorized");
  }

  const supabase = await createClient();
  let query = supabase
    .from("incidents")
    .select(
      "id,public_reference,incident_category,status,priority,address,affected_persons,created_at,updated_at,closed_at",
    )
    .eq("public_reference", reference);

  if (token) query = query.eq("access_token_hash", sha256(token));
  else if (user) query = query.eq("reporter_user_id", user.id);

  const { data, error: err } = await query.single();
  if (err || !data) return error("Incident not found or invalid token.", 404, "not_found");

  return ok({
    id: data.id,
    publicReference: data.public_reference,
    category: data.incident_category,
    status: data.status,
    priority: data.priority,
    address: data.address,
    affectedPersons: data.affected_persons,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
    closedAt: data.closed_at,
  });
}
