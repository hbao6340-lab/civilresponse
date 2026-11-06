import { createClient } from "@/lib/supabase/server";
import { env, warnIfUnconfigured } from "@/lib/env";
import {
  ADMIN_ROLES,
  MFA_REQUIRED_ROLES,
  USER_ROLES,
  VERIFICATION_ROLES,
  type UserRole,
} from "@/lib/constants";

export interface SessionUser {
  id: string;
  email: string | null;
  roles: UserRole[];
}

interface RolesRow {
  role: string | null;
}

export async function getSessionUser(): Promise<SessionUser | null> {
  warnIfUnconfigured();
  if (!env.isSupabaseConfigured) return null;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  // Role lookups are RLS-restricted to self/admin; on failure we fail closed.
  const { data } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id);
  const roles = ((data ?? []) as RolesRow[])
    .map((r) => r.role)
    .filter((r): r is UserRole => typeof r === "string" && r.length > 0);

  return { id: user.id, email: user.email ?? null, roles };
}

export function hasRole(user: SessionUser | null, roles: readonly UserRole[]): boolean {
  return Boolean(user && user.roles.some((r) => roles.includes(r)));
}

export function isAdmin(user: SessionUser | null): boolean {
  return hasRole(user, ADMIN_ROLES);
}

export function isSuperAdmin(user: SessionUser | null): boolean {
  return hasRole(user, ["super_admin"] as const);
}

export function canVerify(user: SessionUser | null): boolean {
  return hasRole(user, VERIFICATION_ROLES);
}

/**
 * Privileged / staff roles: verification_officer, administrator, super_admin.
 * These accounts bypass the responder verification phase and go directly to
 * the control center (/admin/dashboard).
 */
export function isPrivileged(user: SessionUser | null): boolean {
  return canVerify(user);
}

/** Administrators (incl. super_admin) may view accounts; only super_admin may change roles. */
export function canViewUsers(user: SessionUser | null): boolean {
  return isAdmin(user);
}

export function canManageRoles(user: SessionUser | null): boolean {
  return isSuperAdmin(user);
}

/** Incident moderation (status lifecycle) is an administrator capability. */
export function canManageIncidents(user: SessionUser | null): boolean {
  return isAdmin(user);
}

export function canExport(user: SessionUser | null): boolean {
  return isAdmin(user);
}

/** Global config / integrations / security settings are super_admin only. */
export function canManageSettings(user: SessionUser | null): boolean {
  return isSuperAdmin(user);
}

export function requiresMfa(user: SessionUser | null): boolean {
  return hasRole(user, MFA_REQUIRED_ROLES);
}

export function isResponder(user: SessionUser | null): boolean {
  return hasRole(user, ["responder"] as const);
}

/** Highest-privilege role for display/routing. */
export function getPrimaryRole(user: SessionUser | null): UserRole {
  if (!user || user.roles.length === 0) return "citizen";
  if (user.roles.includes("super_admin")) return "super_admin";
  if (user.roles.includes("administrator")) return "administrator";
  if (user.roles.includes("verification_officer")) return "verification_officer";
  if (user.roles.includes("responder")) return "responder";
  return "citizen";
}

export function roleLabel(role: UserRole): string {
  switch (role) {
    case "super_admin":
      return "Super Admin";
    case "administrator":
      return "Administrator";
    case "verification_officer":
      return "Verification Officer";
    case "responder":
      return "Responder";
    case "citizen":
    default:
      return "Citizen";
  }
}

/**
 * Fetch the caller's responder verification status (null when no responder row).
 * RLS allows self-read, so this succeeds for signed-in users.
 */
export async function getResponderVerificationStatus(
  userId: string,
): Promise<string | null> {
  if (!env.isSupabaseConfigured) return null;
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("responders")
      .select("verification_status")
      .eq("user_id", userId)
      .maybeSingle();
    const status = (data as { verification_status?: string } | null)
      ?.verification_status;
    return typeof status === "string" ? status : null;
  } catch {
    return null;
  }
}

/**
 * Single source of truth for where a signed-in user lands.
 *
 * - Privileged staff (verification_officer / administrator / super_admin)
 *   bypass the responder verification phase → control center.
 * - Verified responders → responder dashboard (duty mode, GPS, incidents).
 * - Pending / rejected / suspended responders → verification page.
 * - Responders without a resolvable status → verification page (safe default).
 * - Citizens (no responder / staff role) → shared /dashboard home.
 */
export function getDashboardPath(
  user: SessionUser | null,
  responderVerificationStatus?: string | null,
): string {
  if (!user) return "/login";
  if (isPrivileged(user)) return "/admin/dashboard";
  if (isResponder(user)) {
    return responderVerificationStatus === "verified"
      ? "/responder/dashboard"
      : "/responder/verification";
  }
  return "/dashboard";
}

/** Validate a `next` redirect target (internal paths only). */
export function safeNextPath(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const value = raw.trim();
  // Internal paths only: must start with a single "/" (not "//"), no backslashes.
  if (
    !value.startsWith("/") ||
    value.startsWith("//") ||
    value.startsWith("/\\") ||
    value.includes("\\") ||
    value === "/login"
  ) {
    return null;
  }
  return value;
}

export { USER_ROLES };
export type { UserRole };
