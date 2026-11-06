import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { env } from "@/lib/env";
import {
  ok,
  error,
  forbidden,
  unauthorized,
  notConfigured,
  validationError,
} from "@/lib/api";
import { getSessionUser, canManageRoles } from "@/lib/auth";
import { USER_ROLES } from "@/lib/constants";

const schema = z.object({
  roles: z.array(z.enum(USER_ROLES)).max(USER_ROLES.length),
});

/**
 * PUT /api/v1/admin/users/[id]/roles
 * Super-admin only: replace the target user's role set.
 *
 * Guardrails:
 * - Only super_admin may call this (administrators can view users but not
 *   change roles).
 * - A super admin cannot remove their own super_admin role (prevents lockout).
 * - The last super_admin cannot be removed.
 * Every change is audit-logged via write_audit().
 */
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: targetId } = await params;
  const user = await getSessionUser();
  if (!user) return unauthorized();
  if (!canManageRoles(user)) return forbidden();
  if (!env.isSupabaseConfigured) return notConfigured("Not configured.");

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return validationError(parsed.error);
  const desired = [...new Set(parsed.data.roles)];

  const supabase = await createClient();

  // Self-protection: prevent removing own super_admin (lockout guard).
  if (targetId === user.id && !desired.includes("super_admin")) {
    return error(
      "You cannot remove your own super_admin role. Ask another super admin to demote you, or keep super_admin.",
      400,
      "validation_error",
    );
  }

  // Verify target exists in auth users (via profiles) before writing roles.
  const { data: target } = await supabase
    .from("profiles")
    .select("id")
    .eq("id", targetId)
    .maybeSingle();
  if (!target) return error("User not found.", 404, "not_found");

  // Last-super-admin guard: if we are about to strip super_admin from the
  // target, ensure at least one other super_admin remains.
  const stripsSuperAdmin = (targetId !== undefined) && !desired.includes("super_admin");
  if (stripsSuperAdmin) {
    const { data: currentRoles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", targetId);
    const hasSuperAdmin = ((currentRoles ?? []) as Array<{ role: string | null }>).some(
      (r) => r.role === "super_admin",
    );
    if (hasSuperAdmin) {
      const { count } = await supabase
        .from("user_roles")
        .select("id", { count: "exact", head: true })
        .eq("role", "super_admin");
      // Count includes the target; if only one remains, removal would lock out.
      // (Self-removal is already blocked above, so this covers demoting the
      //  last remaining super admin account.)
      const total = typeof count === "number" ? count : 0;
      if (total <= 1) {
        return error(
          "Cannot remove the last super_admin. Promote another user to super_admin first.",
          400,
          "validation_error",
        );
      }
    }
  }

  // Replace role set: delete existing, insert desired.
  const { error: deleteError } = await supabase
    .from("user_roles")
    .delete()
    .eq("user_id", targetId);
  if (deleteError) return error("Could not update roles.", 500, "db_error");

  if (desired.length > 0) {
    const { error: insertError } = await supabase
      .from("user_roles")
      .insert(desired.map((role) => ({ user_id: targetId, role })));
    if (insertError) return error("Could not update roles.", 500, "db_error");
  }

  // Audit log (best-effort; role change already applied).
  try {
    await supabase.rpc("write_audit", {
      p_actor: user.id,
      p_action: "user.roles.update",
      p_entity_type: "user",
      p_entity_id: targetId,
      p_description: `Roles set to [${desired.join(", ") || "none"}]`,
    });
  } catch {
    // Audit failure must not mask a successful role change.
  }

  return ok({ id: targetId, roles: desired });
}
