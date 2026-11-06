import { createAdminClient, createClient } from "@/lib/supabase/server";
import { env } from "@/lib/env";
import { ok, forbidden, unauthorized, notConfigured } from "@/lib/api";
import {
  canViewIncidentMap,
  getResponderVerificationStatus,
  getSessionUser,
} from "@/lib/auth";
import type { IncidentMarker } from "@/lib/types";

/**
 * GET /api/v1/map/incidents
 * Authorised dashboard feed: all available (active) incidents with exact
 * operational coordinates for the live dashboard map.
 *
 * Authenticated viewers only:
 * - privileged staff (verification_officer / administrator / super_admin)
 * - verified responders
 * Pending responders and citizens get 403 (incident locations are sensitive).
 *
 * "Available" = status not in ('RESOLVED','CANCELLED','FALSE_REPORT').
 * Query `?includeClosed=true` also returns closed incidents (staff debug).
 */
interface IncidentMarkerRow {
  id: unknown;
  public_reference: unknown;
  incident_category: unknown;
  status: unknown;
  priority: unknown;
  address: unknown;
  affected_persons: unknown;
  verification_status: unknown;
  created_at: unknown;
  updated_at: unknown;
  lat: unknown;
  lng: unknown;
}

function toMarker(r: IncidentMarkerRow): IncidentMarker | null {
  const lat = Number(r.lat);
  const lng = Number(r.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (typeof r.id !== "string" && typeof r.id !== "number") return null;
  if (typeof r.public_reference !== "string") return null;
  return {
    id: String(r.id),
    publicReference: r.public_reference,
    category: (r.incident_category as IncidentMarker["category"]) ?? "other",
    status: (r.status as IncidentMarker["status"]) ?? "NEW",
    priority: (r.priority as IncidentMarker["priority"]) ?? "medium",
    address: typeof r.address === "string" ? r.address : null,
    affectedPersons:
      typeof r.affected_persons === "number" ? r.affected_persons : null,
    verificationStatus:
      typeof r.verification_status === "string" ? r.verification_status : "unverified",
    createdAt: String(r.created_at ?? ""),
    updatedAt: String(r.updated_at ?? ""),
    lat,
    lng,
  };
}

/**
 * Fallback parser for direct table reads when the RPC is not yet deployed
 * in the hosted environment: Supabase/PostgREST may return geography as
 * GeoJSON or WKT `POINT(lng lat)`. Returns [lng, lat] or null.
 */
function parseGeography(value: unknown): [number, number] | null {
  if (!value) return null;
  if (typeof value === "string") {
    const m = value.match(/POINT\s*\(\s*([-\d.]+)[ ,]+([-\d.]+)\s*\)/i);
    if (m) {
      const lng = Number(m[1]);
      const lat = Number(m[2]);
      if (Number.isFinite(lat) && Number.isFinite(lng)) return [lng, lat];
    }
    return null;
  }
  if (typeof value === "object") {
    const v = value as { coordinates?: unknown; type?: unknown };
    if (v.type === "Point" && Array.isArray(v.coordinates)) {
      const lng = Number(v.coordinates[0]);
      const lat = Number(v.coordinates[1]);
      if (Number.isFinite(lat) && Number.isFinite(lng)) return [lng, lat];
    }
  }
  return null;
}

export async function GET(request: Request) {
  if (!env.isSupabaseConfigured) return notConfigured("Not configured.");
  const user = await getSessionUser();
  if (!user) return unauthorized();

  const verificationStatus = await getResponderVerificationStatus(user.id);
  if (!canViewIncidentMap(user, verificationStatus)) return forbidden();

  const includeClosed =
    new URL(request.url).searchParams.get("includeClosed") === "true";

  const incidents: IncidentMarker[] = [];

  // Prefer the service-role client (bypasses RLS so verified responders see
  // all available incidents — RLS alone would hide non-assigned incidents).
  // Fall back to the session client (RLS-scoped) when no service key exists.
  const admin = await createAdminClient();
  const queryClient = admin ?? (await createClient());

  const { data: rpcData, error: rpcError } = await queryClient.rpc(
    "active_incident_markers",
    { include_closed: includeClosed },
  );

  if (!rpcError && Array.isArray(rpcData)) {
    for (const row of rpcData as IncidentMarkerRow[]) {
      const marker = toMarker(row);
      if (marker) incidents.push(marker);
    }
  } else {
    // RPC missing / failed (migration not yet applied): fallback to a direct
    // table read. With the admin client RLS is bypassed; with the session
    // client the result is RLS-scoped (reporter/assigned/admin) — still safer
    // than erroring, and the dashboard shows fewer markers until migrated.
    let query = queryClient
      .from("incidents")
      .select(
        "id,public_reference,incident_category,status,priority,address,affected_persons,verification_status,created_at,updated_at,location",
      )
      .order("created_at", { ascending: false })
      .limit(500);
    if (!includeClosed) {
      query = query.not("status", "in", "(RESOLVED,CANCELLED,FALSE_REPORT)");
    }
    const { data: rows } = await query;
    for (const row of (rows ?? []) as Array<Record<string, unknown>>) {
      const coords = parseGeography(row.location);
      if (!coords) continue;
      const marker = toMarker({
        id: row.id,
        public_reference: row.public_reference,
        incident_category: row.incident_category,
        status: row.status,
        priority: row.priority,
        address: row.address,
        affected_persons: row.affected_persons,
        verification_status: row.verification_status,
        created_at: row.created_at,
        updated_at: row.updated_at,
        lat: coords[1],
        lng: coords[0],
      });
      if (marker) incidents.push(marker);
    }
  }

  return ok({
    incidents,
    count: incidents.length,
    serverTime: new Date().toISOString(),
    includeClosed,
  });
}
