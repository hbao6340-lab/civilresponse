"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { OperationsMap } from "@/components/map/operations-map";
import type {
  IncidentMarker,
  PublicResponderMarker,
} from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { formatTimestamp } from "@/lib/utils";

const RESPONDER_POLL_MS = 15_000;
const INCIDENT_POLL_MS = 10_000;

const DEMO_RESPONDERS: PublicResponderMarker[] = [
  { id: "demo-1", displayName: "Volunteer — District 1 (demo)", lat: 10.7769, lng: 106.7008, availabilityStatus: "available", qualifications: ["first_aid"], isDemo: true },
  { id: "demo-2", displayName: "Volunteer — District 3 (demo)", lat: 10.7829, lng: 106.6995, availabilityStatus: "responding", qualifications: ["first_aid", "traffic"], isDemo: true },
  { id: "demo-3", displayName: "Volunteer — Thủ Đức (demo)", lat: 10.8491, lng: 106.6372, availabilityStatus: "available", qualifications: ["first_aid", "water_rescue"], isDemo: true },
  { id: "demo-4", displayName: "Volunteer — Quận 7 (demo)", lat: 10.7308, lng: 106.6930, availabilityStatus: "on_scene", qualifications: ["first_aid"], isDemo: true },
];

const DEMO_INCIDENTS: IncidentMarker[] = [
  { id: "demo-inc-1", publicReference: "CVR-2026-DEMO01", category: "traffic_accident", status: "NEW", priority: "high", address: "District 1, HCMC (demo)", affectedPersons: 2, verificationStatus: "unverified", createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), lat: 10.7762, lng: 106.7001, isDemo: true },
  { id: "demo-inc-2", publicReference: "CVR-2026-DEMO02", category: "medical_emergency", status: "VERIFIED", priority: "critical", address: "District 3, HCMC (demo)", affectedPersons: 1, verificationStatus: "verified", createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), lat: 10.7835, lng: 106.6990, isDemo: true },
  { id: "demo-inc-3", publicReference: "CVR-2026-DEMO03", category: "fire_smoke", status: "NOTIFYING", priority: "medium", address: "Thu Duc, HCMC (demo)", affectedPersons: 0, verificationStatus: "verified", createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), lat: 10.8495, lng: 106.6380, isDemo: true },
];

function priorityTone(priority: string): "red" | "orange" | "grey" {
  if (priority === "critical") return "red";
  if (priority === "high") return "orange";
  return "grey";
}

/**
 * Shared live operations view for both dashboards:
 * - incidents polled every 10s → new reports pop in, dealt-with
 *   (RESOLVED/CANCELLED/FALSE_REPORT) drop out on the next poll
 * - responders polled every 15s → approximate positions track freshness
 * Both pause when the tab is hidden (refetchIntervalInBackground: false)
 * and refetch on window focus.
 */
export function OperationsMapView() {
  const [showIncidents, setShowIncidents] = useState(true);
  const [showResponders, setShowResponders] = useState(true);

  const respondersQuery = useQuery({
    queryKey: ["operations-responders"],
    queryFn: async (): Promise<{
      markers: PublicResponderMarker[];
      demo: boolean;
    }> => {
      const res = await fetch("/api/v1/map/responders");
      if (!res.ok) throw new Error("Responder feed unavailable");
      const json = (await res.json()) as {
        data: { markers: PublicResponderMarker[]; demo?: boolean };
      };
      // demo:true means backend not configured (dev placeholder). demo:false
      // with [] means live-but-empty (no responders on duty) — never fake.
      return {
        markers: json.data.markers ?? [],
        demo: json.data.demo === true,
      };
    },
    refetchInterval: RESPONDER_POLL_MS,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true,
  });

  const incidentsQuery = useQuery({
    queryKey: ["operations-incidents"],
    queryFn: async (): Promise<{
      incidents: IncidentMarker[];
      demo: boolean;
    }> => {
      const res = await fetch("/api/v1/map/incidents");
      const json = (await res.json()) as {
        success: boolean;
        data?: { incidents: IncidentMarker[] };
        error?: { message: string };
      };
      if (res.status === 401) throw new Error("Sign in to view active incidents.");
      if (res.status === 403) {
        throw new Error(
          "You need a verified responder profile or a staff role to view active incidents.",
        );
      }
      if (res.status === 503) {
        // Backend not configured (dev only): show labelled demo simulation.
        // Configured production never hits this — live empty stays empty.
        return { incidents: [], demo: true };
      }
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message ?? "Incident feed unavailable");
      }
      return { incidents: json.data?.incidents ?? [], demo: false };
    },
    refetchInterval: INCIDENT_POLL_MS,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true,
  });

  const respondersFeed = respondersQuery.data;
  const incidentsFeed = incidentsQuery.data;
  const responderLive = useMemo(
    () => respondersFeed?.markers ?? [],
    [respondersFeed],
  );
  const incidentLive = useMemo(
    () => incidentsFeed?.incidents ?? [],
    [incidentsFeed],
  );
  // Demo simulation appears ONLY when the backend is not configured
  // (responders demo:true / incidents 503). Configured production with an
  // empty live feed shows empty (no fake markers).
  const usingDemoResponders = respondersFeed?.demo === true;
  const usingDemoIncidents = incidentsFeed?.demo === true;
  const responders = useMemo(
    () => (respondersFeed?.demo ? DEMO_RESPONDERS : responderLive),
    [respondersFeed, responderLive],
  );
  // Unauthorized viewers (e.g. pending responders) see no incident markers —
  // never the demo set, which could be mistaken for real incidents.
  const incidents = useMemo(
    () => {
      if (incidentsQuery.error) return [] as IncidentMarker[];
      return incidentsFeed?.demo ? DEMO_INCIDENTS : incidentLive;
    },
    [incidentLive, incidentsQuery.error, incidentsFeed],
  );

  const activeIncidents = useMemo(() => {
    const visible = incidents;
    const closed = new Set(["RESOLVED", "CANCELLED", "FALSE_REPORT"]);
    return visible.filter((i) => !closed.has(i.status));
  }, [incidents]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <Badge tone="green">
            ● Live · incidents {activeIncidents.length} · responders {responders.length}
          </Badge>
          {(usingDemoIncidents || usingDemoResponders) && (
            <Badge tone="orange">
              Demo data — labelled simulation (no live feed connected)
            </Badge>
          )}
          <span className="text-xs text-slate-500">
            Incidents update {INCIDENT_POLL_MS / 1000}s · responders{" "}
            {RESPONDER_POLL_MS / 1000}s
            {incidentsQuery.dataUpdatedAt
              ? ` · incidents ${new Date(incidentsQuery.dataUpdatedAt).toLocaleTimeString()}`
              : ""}{" "}
            {respondersQuery.dataUpdatedAt
              ? `· responders ${new Date(respondersQuery.dataUpdatedAt).toLocaleTimeString()}`
              : ""}
          </span>
        </div>
        <div className="flex flex-wrap gap-4 text-sm">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={showIncidents}
              onChange={(e) => setShowIncidents(e.target.checked)}
            />
            Incidents
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={showResponders}
              onChange={(e) => setShowResponders(e.target.checked)}
            />
            Responders
          </label>
        </div>
      </div>

      {incidentsQuery.error && (
        <p
          role="alert"
          className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800"
        >
          {(incidentsQuery.error as Error).message} Incident markers are hidden.
          In an emergency, call 113 / 114 / 115.
        </p>
      )}
      {respondersQuery.error && (
        <p
          role="alert"
          className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800"
        >
          Responder feed unavailable. Responder markers are hidden until the
          live feed recovers.
        </p>
      )}

      <OperationsMap
        responders={responders}
        incidents={incidents}
        showResponders={showResponders}
        showIncidents={showIncidents}
      />

      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <h2 className="text-sm font-semibold text-slate-900">
          Active incidents ({activeIncidents.length})
        </h2>
        <p className="mt-1 text-xs text-slate-500">
          Available (not resolved / cancelled) — refreshes live as new reports
          arrive and as incidents are dealt with.
        </p>
        {activeIncidents.length === 0 ? (
          <p className="mt-2 text-sm text-slate-500">
            No active incidents right now.
          </p>
        ) : (
          <ul className="mt-3 space-y-2">
            {activeIncidents.slice(0, 20).map((i) => (
              <li
                key={i.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-slate-200 p-3 text-sm"
              >
                <span>
                  <span className="font-mono">{i.publicReference}</span>{" "}
                  <span className="text-slate-600">
                    {i.category.replaceAll("_", " ")}
                  </span>
                  {i.address && (
                    <span className="mt-0.5 block text-xs text-slate-500">
                      {i.address}
                    </span>
                  )}
                </span>
                <span className="flex items-center gap-2">
                  <Badge tone={priorityTone(i.priority)}>{i.priority}</Badge>
                  <Badge tone="navy">{i.status.replaceAll("_", " ")}</Badge>
                  <span className="text-slate-500">
                    {formatTimestamp(i.createdAt)}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        )}
        {activeIncidents.length > 20 && (
          <p className="mt-2 text-xs text-slate-500">
            Showing 20 of {activeIncidents.length} — additional incidents are
            on the map.
          </p>
        )}
      </div>
    </div>
  );
}
