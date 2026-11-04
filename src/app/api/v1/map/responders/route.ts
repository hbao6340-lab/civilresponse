import { createClient } from "@/lib/supabase/server";
import { env } from "@/lib/env";
import { ok } from "@/lib/api";
import { jitterPoint } from "@/lib/geo";
import { GPS } from "@/lib/constants";
import type { PublicResponderMarker } from "@/lib/types";

/**
 * GET /api/v1/map/responders
 * Public, privacy-protected responder markers.
 * Only verified, on-duty, location-sharing, public-visibility responders
 * with fresh GPS are returned. Coordinates are jittered before exposure.
 */
export async function GET() {
  if (!env.isSupabaseConfigured) {
    return ok({ markers: [] as PublicResponderMarker[], demo: true });
  }
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("public_responder_markers");
  if (error || !data) return ok({ markers: [] as PublicResponderMarker[] });

  const markers: PublicResponderMarker[] = [];
  for (const r of data as Record<string, unknown>[]) {
    const lat = Number(r.lat);
    const lng = Number(r.lng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;
    const j = jitterPoint(lat, lng, GPS.publicJitterMeters);
    markers.push({
      id: String(r.id),
      displayName: String(r.display_name ?? "Responder"),
      lat: j.lat,
      lng: j.lng,
      availabilityStatus: String(r.availability_status ?? "offline"),
      qualifications: [],
    });
  }

  return ok({ markers });
}
