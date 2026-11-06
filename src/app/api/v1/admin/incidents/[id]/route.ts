import { z } from "zod";
import { createAdminClient, createClient } from "@/lib/supabase/server";
import { env } from "@/lib/env";
import {
  ok,
  error,
  forbidden,
  unauthorized,
  notConfigured,
  validationError,
} from "@/lib/api";
import { getSessionUser, canManageIncidents } from "@/lib/auth";
import { INCIDENT_STATUSES } from "@/lib/constants";

const schema = z.object({
  status: z.enum(INCIDENT_STATUSES),
  note: z.string().trim().max(1000).optional(),
  priority: z.enum(["low", "medium", "high", "critical"]).optional(),
});

/**
 * PATCH /api/v1/admin/incidents/[id]
 * Administrator incident moderation: move the lifecycle status forward
 * (NEW → PENDING_REVIEW → VERIFIED → … → RESOLVED / CANCELLED / FALSE_REPORT).
 * Verification officers cannot call this (administrator + super_admin only).
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const user = await getSessionUser();
  if (!user) return unauthorized();
  if (!canManageIncidents(user)) return forbidden();
  if (!env.isSupabaseConfigured) return notConfigured("Not configured.");

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return validationError(parsed.error);
  const input = parsed.data;

  const supabase = await createClient();

  const { data: current } = await supabase
    .from("incidents")
    .select("id,status")
    .eq("id", id)
    .maybeSingle();
  if (!current) return error("Incident not found.", 404, "not_found");

  const patch: Record<string, unknown> = { status: input.status };
  if (input.priority) patch.priority = input.priority;
  if (["RESOLVED", "CANCELLED", "FALSE_REPORT"].includes(input.status)) {
    patch.closed_at = new Date().toISOString();
  }

  const { error: updateError } = await supabase
    .from("incidents")
    .update(patch)
    .eq("id", id);
  if (updateError) return error("Could not update incident.", 500, "db_error");

  // Lifecycle event trail (best-effort). incident_events has no INSERT RLS
  // policy for the session client, so prefer the admin client when configured.
  try {
    const admin = await createAdminClient();
    const eventRow = {
      incident_id: id,
      actor_user_id: user.id,
      event_type: "admin_status_update",
      previous_status: (current as { status: string }).status,
      new_status: input.status,
      description: input.note ?? `Status set to ${input.status} by administrator.`,
    };
    if (admin) {
      await admin.from("incident_events").insert(eventRow);
    } else {
      await supabase.from("incident_events").insert(eventRow);
    }
  } catch {
    // Event trail is advisory; the status update already applied.
  }

  return ok({ id, status: input.status });
}
