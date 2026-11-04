import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { env } from "@/lib/env";
import { ok, forbidden, unauthorized, notConfigured, validationError, error } from "@/lib/api";
import { getSessionUser, isAdmin, canVerify } from "@/lib/auth";

const schema = z.object({
  decision: z.enum(["verified", "rejected", "suspended"]),
  reason: z.string().trim().max(500).optional(),
});

/**
 * POST /api/v1/admin/responders/[id]/verify
 * Verification officers / admins approve, reject, or suspend a responder.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const user = await getSessionUser();
  if (!user) return unauthorized();
  if (!isAdmin(user) && !canVerify(user)) return forbidden();
  if (!env.isSupabaseConfigured) return notConfigured("Not configured.");

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return validationError(parsed.error);

  const supabase = await createClient();
  const { error: rpcError } = await supabase.rpc("set_responder_verification", {
    p_responder_id: id,
    p_status: parsed.data.decision,
    p_reason: parsed.data.reason ?? null,
  });
  if (rpcError) return error("Could not record decision.", 500, "db_error");

  return ok({ decision: parsed.data.decision });
}
