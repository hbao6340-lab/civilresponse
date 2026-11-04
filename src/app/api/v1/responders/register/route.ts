import { z } from "zod";
import { createAdminClient, createClient } from "@/lib/supabase/server";
import { env } from "@/lib/env";
import { created, error, validationError, notConfigured } from "@/lib/api";
import { rateLimited, clientIp } from "@/lib/rate-limit";

const schema = z.object({
  displayName: z.string().trim().min(2).max(120),
  email: z.string().email().max(255),
  phone: z.string().trim().min(6).max(30),
  operatingArea: z.string().trim().min(2).max(200),
  qualifications: z.string().trim().max(1000).optional(),
});

/**
 * POST /api/v1/responders/register
 * Public until Supabase Auth email confirmation completes (Phase 2).
 * Creates a pending responder record; provisioning of the user happens via
 * Supabase Auth sign-up email flow.
 */
export async function POST(request: Request) {
  if (!env.isSupabaseConfigured) {
    return notConfigured("Registration requires a configured backend.");
  }
  if (rateLimited(`reg:${clientIp(request)}`, 5, 3600_000)) {
    return error("Too many applications.", 429, "rate_limited");
  }

  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return validationError(parsed.error);
  const input = parsed.data;

  const admin = await createAdminClient();
  if (admin) {
    // Store contact details; user_id is bound after email confirmation.
    const { error: err } = await admin.from("responders").insert({
      display_name: input.displayName,
      phone: input.phone,
      verification_status: "pending",
      availability_status: "offline",
      duty_mode: false,
      location_sharing_enabled: false,
      public_visibility: false,
    });
    if (err) return error("Could not submit application.", 500, "db_error");
  } else {
    const supabase = await createClient();
    const { error: rpcError } = await supabase.rpc("register_responder_application", {
      p_display_name: input.displayName,
      p_phone: input.phone,
      p_operating_area: input.operatingArea,
    });
    if (rpcError) return error("Could not submit application.", 500, "db_error");
  }

  return created({
    message:
      "Application submitted. Check your email to confirm your account, then upload verification documents.",
  });
}
