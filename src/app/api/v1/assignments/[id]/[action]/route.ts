import { createClient } from "@/lib/supabase/server";
import { env } from "@/lib/env";
import { ok, error, unauthorized, notConfigured } from "@/lib/api";
import { getSessionUser } from "@/lib/auth";

/**
 * POST /api/v1/assignments/[id]/[action]
 * Accept / decline an assignment. Transaction-aware via RPC.
 */
export async function POST(
  _request: Request,
  {
    params,
  }: {
    params: Promise<{ id: string; action: string }>;
  },
) {
  const { id, action } = await params;
  const user = await getSessionUser();
  if (!user) return unauthorized();
  if (!env.isSupabaseConfigured) return notConfigured("Not configured.");
  if (action !== "accept" && action !== "decline") {
    return error("Invalid action.", 400, "validation_error");
  }

  const supabase = await createClient();
  const { data: responder } = await supabase
    .from("responders")
    .select("id,verification_status")
    .eq("user_id", user.id)
    .single();
  if (!responder) return error("Responder profile not found.", 404, "not_found");
  if (responder.verification_status !== "verified") {
    return error("Only verified responders can accept assignments.", 403, "forbidden");
  }

  const { error: rpcError } = await supabase.rpc("set_assignment_action", {
    p_assignment_id: id,
    p_responder_id: responder.id,
    p_action: action,
  });
  if (rpcError) return error("Could not record action.", 500, "db_error");

  return ok({ recorded: action });
}
