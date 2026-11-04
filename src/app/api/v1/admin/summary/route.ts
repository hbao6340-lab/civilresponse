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
  const { data } = await supabase.rpc("admin_summary");
  const row = (Array.isArray(data) ? data[0] : data) ?? {};

  return ok({
    registeredResponders: Number(row.registered_responders ?? 0),
    verifiedResponders: Number(row.verified_responders ?? 0),
    onDuty: Number(row.on_duty ?? 0),
    available: Number(row.available ?? 0),
    responding: Number(row.responding ?? 0),
    activeIncidents: Number(row.active_incidents ?? 0),
    unassignedIncidents: Number(row.unassigned_incidents ?? 0),
    resolvedToday: Number(row.resolved_today ?? 0),
    pendingVerification: Number(row.pending_verification ?? 0),
  });
}
