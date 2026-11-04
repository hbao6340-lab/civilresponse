import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { env } from "@/lib/env";
import { ok, unauthorized, notConfigured, validationError, error } from "@/lib/api";
import { getSessionUser } from "@/lib/auth";

const schema = z.object({
  endpoint: z.string().url().max(2048),
  keys: z.object({
    p256dh: z.string().max(500),
    auth: z.string().max(500),
  }),
  platform: z.enum(["web", "android", "ios"]).default("web"),
});

/**
 * POST /api/v1/notifications/push
 * Web Push subscription registration. FCM architecture is prepared for
 * future mobile (same table, platform column) but no keys are shipped here.
 */
export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) return unauthorized();
  if (!env.isSupabaseConfigured) return notConfigured("Not configured.");

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return validationError(parsed.error);

  const supabase = await createClient();
  const { error: err } = await supabase.from("push_subscriptions").upsert(
    {
      user_id: user.id,
      endpoint: parsed.data.endpoint,
      keys: parsed.data.keys,
      platform: parsed.data.platform,
    },
    { onConflict: "user_id,endpoint" },
  );
  if (err) return error("Could not save subscription.", 500, "db_error");
  return ok({ saved: true });
}
