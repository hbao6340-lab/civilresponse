/**
 * Shared domain constants for CIVIRESPOND.
 * Coordinates: Ho Chi Minh City centre (Bến Thành / District 1), WGS84.
 */

export const SITE = {
  name: "CIVIRESPOND",
  tagline: "Connecting Communities. Accelerating Emergency Response.",
  fullName: "Community First Responder Network",
  city: "Ho Chi Minh City",
  hcmc: { lat: 10.776889, lng: 106.700806, zoom: 12 },
} as const;

export const INCIDENT_CATEGORIES = [
  "traffic_accident",
  "medical_emergency",
  "fire_smoke",
  "drowning_water",
  "missing_person",
  "public_safety",
  "violence_danger",
  "other",
] as const;

export type IncidentCategory = (typeof INCIDENT_CATEGORIES)[number];

export const INCIDENT_CATEGORY_LABEL: Record<IncidentCategory, string> = {
  traffic_accident: "Traffic accident",
  medical_emergency: "Medical emergency",
  fire_smoke: "Fire or smoke",
  drowning_water: "Drowning / water emergency",
  missing_person: "Missing person",
  public_safety: "Public safety concern",
  violence_danger: "Violence / immediate danger",
  other: "Other",
};

export const INCIDENT_STATUSES = [
  "NEW",
  "PENDING_REVIEW",
  "VERIFIED",
  "NOTIFYING",
  "ACCEPTED",
  "EN_ROUTE",
  "ON_SCENE",
  "RESOLVED",
  "CANCELLED",
  "FALSE_REPORT",
] as const;

/** Incident statuses still requiring response (dashboard "available" set). */
export const ACTIVE_INCIDENT_STATUSES: readonly (typeof INCIDENT_STATUSES)[number][] = [
  "NEW",
  "PENDING_REVIEW",
  "VERIFIED",
  "NOTIFYING",
  "ACCEPTED",
  "EN_ROUTE",
  "ON_SCENE",
];

/** Closed incident statuses — hidden from available-incident feeds. */
export const CLOSED_INCIDENT_STATUSES: readonly (typeof INCIDENT_STATUSES)[number][] = [
  "RESOLVED",
  "CANCELLED",
  "FALSE_REPORT",
];

export type IncidentStatus = (typeof INCIDENT_STATUSES)[number];

export const USER_ROLES = [
  "citizen",
  "responder",
  "verification_officer",
  "administrator",
  "super_admin",
] as const;

export type UserRole = (typeof USER_ROLES)[number];

/** Roles permitted to reach administration routes. */
export const ADMIN_ROLES: readonly UserRole[] = [
  "administrator",
  "super_admin",
];

/** Roles permitted to review responder verification. */
export const VERIFICATION_ROLES: readonly UserRole[] = [
  "verification_officer",
  "administrator",
  "super_admin",
];

/** Privileged roles whose accounts should require MFA (policy; enforced by Supabase Auth settings). */
export const MFA_REQUIRED_ROLES: readonly UserRole[] = [
  "verification_officer",
  "administrator",
  "super_admin",
];

export const GPS = {
  /** Default HCMC bounding box; server validates coordinates against this. */
  bbox: { minLat: 10.3, maxLat: 11.1, minLng: 106.3, maxLng: 107.3 },
  /** Max age of a location fix before it is considered stale (ms). */
  maxFreshMs: 120_000,
  /** Moving interval; stationary interval (ms). */
  movingIntervalMs: 7_500,
  stationaryIntervalMs: 25_000,
  /** Movement below this distance (m) counts as stationary. */
  movementThresholdM: 25,
  /** Public map privacy offset: coordinates are jittered before exposure. */
  publicJitterMeters: 500,
} as const;

/** Official emergency numbers in Vietnam — always surfaced to citizens. */
export const EMERGENCY_NUMBERS = {
  police: "113",
  fire: "114",
  ambulance: "115",
} as const;
