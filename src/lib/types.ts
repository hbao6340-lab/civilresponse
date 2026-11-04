import type {
  IncidentCategory,
  IncidentStatus,
  UserRole,
} from "@/lib/constants";

/** Row shapes returned by Supabase (subset relevant to the app layer). */

export interface ResponderSummary {
  id: string;
  userId: string;
  displayName: string;
  verificationStatus: "pending" | "verified" | "rejected" | "suspended";
  availabilityStatus: "available" | "busy" | "away" | "offline";
  dutyMode: boolean;
  publicVisibility: boolean;
}

export interface PublicResponderMarker {
  id: string;
  displayName: string;
  /** Privacy-offset coordinates (never exact). */
  lat: number;
  lng: number;
  availabilityStatus: string;
  distanceMeters?: number;
  qualifications: string[];
  isDemo?: boolean;
}

export interface IncidentRecord {
  id: string;
  publicReference: string;
  category: IncidentCategory;
  status: IncidentStatus;
  priority: "low" | "medium" | "high" | "critical";
  address: string | null;
  affectedPersons: number | null;
  createdAt: string;
  updatedAt: string;
  closedAt: string | null;
  /** Present only to authorised viewers. */
  latitude?: number;
  longitude?: number;
  description?: string;
}

export interface AssignmentRecord {
  id: string;
  incidentId: string;
  responderId: string;
  assignmentStatus: string;
  notifiedAt: string | null;
  acceptedAt: string | null;
  arrivedAt: string | null;
  completedAt: string | null;
}

export type { UserRole };
