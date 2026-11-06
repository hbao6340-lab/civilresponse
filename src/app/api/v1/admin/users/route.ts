import { createClient } from "@/lib/supabase/server";
import { env } from "@/lib/env";
import { ok, forbidden, unauthorized, notConfigured } from "@/lib/api";
import { getSessionUser, canViewUsers } from "@/lib/auth";
import type { UserRole } from "@/lib/constants";

const PRIVILEGE_ORDER: Record<string, number> = {
  super_admin: 4,
  administrator: 3,
  verification_officer: 2,
  responder: 1,
  citizen: 0,
};

export async function GET() {
  const user = await getSessionUser();
  if (!user) return unauthorized();
  // Account listing is administrator + super_admin only. Verification
  // officers do not have access (they only review responder applications).
  if (!canViewUsers(user)) return forbidden();
  if (!env.isSupabaseConfigured) return notConfigured("Not configured.");

  const supabase = await createClient();
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id,email,created_at")
    .order("created_at", { ascending: false })
    .limit(200);

  const profileList = (profiles ?? []) as Array<{
    id: string;
    email: string | null;
    created_at: string;
  }>;

  // Join user_roles so the UI shows actual roles (previously always []).
  const ids = profileList.map((p) => p.id);
  const rolesByUser = new Map<string, UserRole[]>();
  if (ids.length > 0) {
    const { data: roleRows } = await supabase
      .from("user_roles")
      .select("user_id,role")
      .in("user_id", ids);
    for (const row of (roleRows ?? []) as Array<{
      user_id: string;
      role: string;
    }>) {
      const list = rolesByUser.get(row.user_id) ?? [];
      if (row.role) list.push(row.role as UserRole);
      rolesByUser.set(row.user_id, list);
    }
  }

  const users = profileList.map((p) => {
    const roles = [...(rolesByUser.get(p.id) ?? [])].sort(
      (a, b) => (PRIVILEGE_ORDER[b] ?? 0) - (PRIVILEGE_ORDER[a] ?? 0),
    );
    return {
      id: String(p.id),
      email: String(p.email ?? "—"),
      roles,
      createdAt: String(p.created_at),
    };
  });

  return ok({ users });
}
