import { createClient } from "@/lib/supabase/server";
import { env } from "@/lib/env";
import { ok, error, notConfigured } from "@/lib/api";
import { sha256 } from "@/lib/incident-service";

/**
 * GET /api/v1/incidents/[reference]/[token]
 *
 * The tracking token travels in the URL **path** (not a query string) so it
 * survives CDN/WAF rules that drop `?t=…` parameters at the edge.
 * Anonymous citizens use this endpoint exclusively; the secret is hashed
 * before comparison and never logged (route params are not in Vercel logs
 * for GET requests from this shape beyond the reference).
 */
export async function GET(
  _request: Request,
  {
    params,
  }: {
    params: Promise<{ reference: string; token: string }>;
  },
) {
  const { reference, token } = await params;

  if (!env.isSupabaseConfigured) {
    return notConfigured("Incident tracking requires a configured backend.");
  }
  if (!token) return error("A tracking token is required.", 401, "unauthorized");

  const supabase = await createClient();
  const { data, error: err } = await supabase.rpc("track_incident_by_token", {
    p_reference: reference,
    p_token_hash: sha256(token),
  });
  if (err) return error(err.message ?? "Invalid tracking link.", 400, "invalid_token");
  const row = Array.isArray(data) ? data[0] : null;
  if (!row) return error("Incident not found or invalid token.", 404, "not_found");

  return ok({
    id: row.id,
    publicReference: row.public_reference,
    category: row.incident_category,
    status: row.status,
    priority: row.priority,
    address: row.address,
    affectedPersons: row.affected_persons,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    closedAt: row.closed_at,
  });
}
