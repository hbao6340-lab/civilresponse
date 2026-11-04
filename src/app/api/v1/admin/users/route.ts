import { createClient } from "@/lib/supabase/server";
import { env } from "@/lib/env";
import { ok, forbidden, unauthorized, notConfigured } from "@/lib/api";
import { getSessionUser, isAdmin } from "@/lib/auth";

export async function GET() {
  const user = await getSessionUser();
  if (!user) return unauthorized();
  if (!isAdmin(user)) return forbidden();
  if (!env.isSupabaseConfigured) return notConfigured("Not configured.");

  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("id,email,created_at")
    .order("created_at", { ascending: false })
    .limit(200);

  const users = (data ?? []).map((p) => ({
    id: String(p.id),
    email: String(p.email ?? "—"),
    roles: [] as string[],
    createdAt: String(p.created_at),
  }));

  return ok({ users });
}
