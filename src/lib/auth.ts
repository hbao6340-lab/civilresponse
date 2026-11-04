import { createClient } from "@/lib/supabase/server";
import { env, warnIfUnconfigured } from "@/lib/env";
import {
  ADMIN_ROLES,
  MFA_REQUIRED_ROLES,
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

export function canVerify(user: SessionUser | null): boolean {
  return hasRole(user, VERIFICATION_ROLES);
}

export function requiresMfa(user: SessionUser | null): boolean {
  return hasRole(user, MFA_REQUIRED_ROLES);
}

export function isResponder(user: SessionUser | null): boolean {
  return hasRole(user, ["responder"] as const);
}
