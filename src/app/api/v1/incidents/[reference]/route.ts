import { createClient } from "@/lib/supabase/server";
import { env } from "@/lib/env";
import { ok, error, notConfigured } from "@/lib/api";
import { getSessionUser } from "@/lib/auth";

/**
 * GET /api/v1/incidents/[reference]
 * Authenticated-only path (session). Anonymous citizens must use
 * /api/v1/incidents/[reference]/[token] — the token-in-path shape avoids
 * CDN/WAF query-string interception.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ reference: string }> },
) {
  const { reference } = await params;
  const user = await getSessionUser().catch(() => null);

  if (!env.isSupabaseConfigured) {
    return notConfigured("Incident tracking requires a configured backend.");
  }
  if (!user) {
    return error(
      "Authentication required. Anonymous tracking uses the token path.",
      401,
      "unauthorized",
    );
  }

  const supabase = await createClient();
  const { data, error: err } = await supabase
    .from("incidents")
    .select(
      "id,public_reference,incident_category,status,priority,address,affected_persons,created_at,updated_at,closed_at",
    )
    .eq("public_reference", reference)
    .eq("reporter_user_id", user.id)
    .single();
  if (err || !data) return error("Incident not found.", 404, "not_found");

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
