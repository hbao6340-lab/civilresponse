import { z } from "zod";
import { GPS, INCIDENT_CATEGORIES, INCIDENT_STATUSES } from "@/lib/constants";

/** Shared Zod schemas for request validation (API + forms). */

export const uuidSchema = z.string().uuid();

export const gpsPointSchema = z
  .object({
    latitude: z.number().min(-90).max(90),
    longitude: z.number().min(-180).max(180),
  })
  .refine(
    (p) =>
      p.latitude >= GPS.bbox.minLat &&
      p.latitude <= GPS.bbox.maxLat &&
      p.longitude >= GPS.bbox.minLng &&
      p.longitude <= GPS.bbox.maxLng,
    { message: "Coordinates must fall within Ho Chi Minh City bounds." },
  );

export const locationUpdateSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  accuracyMeters: z.number().min(0).max(1000).nullable().optional(),
  heading: z.number().min(0).max(360).nullable().optional(),
  speedMetersPerSecond: z.number().min(0).max(100).nullable().optional(),
});

export const nearbySearchSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  radiusMeters: z.number().int().min(100).max(50_000).default(3000),
  category: z.enum(INCIDENT_CATEGORIES).optional(),
  limit: z.number().int().min(1).max(100).default(20),
});

export const incidentReportSchema = z.object({
  category: z.enum(INCIDENT_CATEGORIES),
  description: z.string().trim().min(10).max(4000),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  address: z.string().trim().max(500).optional().nullable(),
  affectedPersons: z.number().int().min(0).max(10_000).optional().nullable(),
  contactDetails: z.string().trim().max(300).optional().nullable(),
  consent: z.literal(true, {
    message: "You must acknowledge the privacy notice to submit a report.",
  }),
  captchaToken: z.string().min(1).optional(),
});

export const incidentStatusUpdateSchema = z.object({
  status: z.enum(INCIDENT_STATUSES),
  note: z.string().trim().max(1000).optional(),
});

export const assignmentActionSchema = z.object({
  action: z.enum(["accept", "decline"]),
  note: z.string().trim().max(1000).optional(),
});

export const dutyModeSchema = z.object({
  dutyMode: z.boolean(),
  availabilityStatus: z
    .enum(["available", "busy", "away", "offline"])
    .optional(),
  locationSharingEnabled: z.boolean().optional(),
  publicVisibility: z.boolean().optional(),
});

export const consentSchema = z.object({
  consentType: z.enum([
    "location_sharing",
    "public_map_visibility",
    "incident_notifications",
    "marketing_communications",
  ]),
  policyVersion: z.string().min(1).max(32),
  granted: z.boolean(),
});

export const messageSchema = z.object({
  conversationId: uuidSchema,
  body: z.string().trim().min(1).max(4000),
});

export type LocationUpdate = z.infer<typeof locationUpdateSchema>;
export type NearbySearch = z.infer<typeof nearbySearchSchema>;
export type IncidentReport = z.infer<typeof incidentReportSchema>;
