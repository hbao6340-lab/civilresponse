import { createClient } from "@/lib/supabase/server";
import { env } from "@/lib/env";
import { created, unauthorized, notConfigured, validationError, error } from "@/lib/api";
import { getSessionUser } from "@/lib/auth";
import { messageSchema } from "@/lib/validation";
import { rateLimited } from "@/lib/rate-limit";

/**
 * POST /api/v1/messages
 * Incident-scoped messaging. Conversation membership is enforced by RLS +
 * a server check — users can never message outside their incidents.
 */
export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) return unauthorized();
  if (!env.isSupabaseConfigured) return notConfigured("Not configured.");
  if (rateLimited(`msg:${user.id}`, 60, 60_000)) {
    return error("Too many messages.", 429, "rate_limited");
  }

  const parsed = messageSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return validationError(parsed.error);

  const supabase = await createClient();
  // Membership check (RLS also enforces, belt-and-braces).
  const { data: member } = await supabase
    .from("conversations")
    .select("id")
    .eq("id", parsed.data.conversationId)
    .eq("participant_user_id", user.id)
    .single();
  if (!member) return error("Not a participant in this conversation.", 403, "forbidden");

  const { data, error: err } = await supabase
    .from("messages")
    .insert({
      conversation_id: parsed.data.conversationId,
      sender_user_id: user.id,
      body: parsed.data.body,
    })
    .select("id,created_at")
    .single();
  if (err) return error("Could not send message.", 500, "db_error");

  return created({ id: data.id, createdAt: data.created_at });
}
