import { createClient } from "@/lib/supabase/server";
import { env } from "@/lib/env";
import { forbidden, unauthorized, notConfigured, error } from "@/lib/api";
import { getSessionUser, isAdmin } from "@/lib/auth";

const ALLOWED = ["incidents", "responders", "assignments", "audit"] as const;
type Kind = (typeof ALLOWED)[number];

/** CSV export — aggregated operational data only. */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ kind: string }> },
) {
  const { kind } = await params;
  const user = await getSessionUser();
  if (!user) return unauthorized();
  if (!isAdmin(user)) return forbidden();
  if (!env.isSupabaseConfigured) return notConfigured("Not configured.");
  if (!(ALLOWED as readonly string[]).includes(kind)) {
    return error("Unknown export.", 400, "validation_error");
  }

  const supabase = await createClient();
  const { data } = await supabase.rpc("admin_export_csv", {
    p_kind: kind as Kind,
  });

  const csv = typeof data === "string" ? data : "id,value\n";
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="civirespond-${kind}.csv"`,
    },
  });
}
