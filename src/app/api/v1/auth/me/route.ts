import { createClient } from "@/lib/supabase/server";
import { env } from "@/lib/env";
import { ok, unauthorized, notConfigured } from "@/lib/api";
import {
  canExport,
  canManageIncidents,
  canManageRoles,
  canManageSettings,
  canVerify,
  canViewUsers,
  getDashboardPath,
  getPrimaryRole,
  getResponderVerificationStatus,
  getSessionUser,
  isPrivileged,
  isResponder,
  isSuperAdmin,
  roleLabel,
} from "@/lib/auth";

/**
 * GET /api/v1/auth/me
 * Authoritative session profile for routing/UI after sign-in.
 * Returns roles, the computed dashboardPath, and capability flags that mirror
 * server-side enforcement (never trust client-side role guesses).
 */
export async function GET() {
  if (!env.isSupabaseConfigured) return notConfigured("Not configured.");
  const user = await getSessionUser();
  if (!user) return unauthorized();

  const responderStatus = isResponder(user)
    ? await getResponderVerificationStatus(user.id)
    : null;

  let responder: { verificationStatus: string | null; dutyMode: boolean | null } | null = null;
  if (isResponder(user) || isPrivileged(user)) {
    try {
      const supabase = await createClient();
      const { data } = await supabase
        .from("responders")
        .select("verification_status,duty_mode")
        .eq("user_id", user.id)
        .maybeSingle();
      if (data) {
        const row = data as { verification_status?: string; duty_mode?: boolean };
        responder = {
          verificationStatus: row.verification_status ?? null,
          dutyMode: Boolean(row.duty_mode),
        };
      }
    } catch {
      responder = null;
    }
  }

  const effectiveStatus = responderStatus ?? responder?.verificationStatus ?? null;
  const dashboardPath = getDashboardPath(user, effectiveStatus);
  const primaryRole = getPrimaryRole(user);

  return ok({
    id: user.id,
    email: user.email,
    roles: user.roles,
    primaryRole,
    primaryLabel: roleLabel(primaryRole),
    isPrivileged: isPrivileged(user),
    isSuperAdmin: isSuperAdmin(user),
    dashboardPath,
    responder,
    capabilities: {
      canVerify: canVerify(user),
      canManageIncidents: canManageIncidents(user),
      canViewUsers: canViewUsers(user),
      canManageRoles: canManageRoles(user),
      canExport: canExport(user),
      canManageSettings: canManageSettings(user),
      isResponder: isResponder(user),
    },
  });
}
