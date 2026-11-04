import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { env } from "@/lib/env";
import { created, error, unauthorized, notConfigured, validationError } from "@/lib/api";
import { getSessionUser } from "@/lib/auth";

const schema = z.object({
  documentType: z.string().trim().min(2).max(120),
  note: z.string().trim().max(500).optional(),
  // storagePath set after a real signed upload (Phase 2 file flow).
  storagePath: z.string().max(500).optional(),
});

/**
 * POST /api/v1/responders/documents
 * Records the intent to submit a document. The file itself uploads to a
 * private bucket via signed URLs (Phase 2); no PII travels in this call.
 */
export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) return unauthorized();
  if (!env.isSupabaseConfigured) return notConfigured("Not configured.");

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return validationError(parsed.error);

  const supabase = await createClient();
  const { error: err } = await supabase.from("responder_documents").insert({
    responder_id: (await supabase.from("responders").select("id").eq("user_id", user.id).single()).data?.id,
    document_type: parsed.data.documentType,
    storage_path: parsed.data.storagePath ?? null,
    review_status: "pending",
  });
  if (err) return error("Could not record document.", 500, "db_error");

  return created({ recorded: true });
}
