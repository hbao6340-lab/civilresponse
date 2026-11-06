"use client";

import { useEffect, useRef } from "react";
import type {
  IncidentMarker,
  PublicResponderMarker,
} from "@/lib/types";
import { SITE, EMERGENCY_NUMBERS } from "@/lib/constants";
import { env } from "@/lib/env";

/**
 * Dashboard operations map — incidents + responders.
 *
 * Authorised viewers only (staff + verified responders). Incidents use exact
 * operational coordinates from /api/v1/map/incidents; responders use the
 * privacy-protected approximations from /api/v1/map/responders.
 *
 * Live-update friendly: the MapLibre map instance is created once; polled
 * prop changes are applied in place (markers added / moved / removed)
 * without remounting, so pan/zoom is preserved. When an incident is dealt
 * with (RESOLVED/CANCELLED/FALSE_REPORT) it drops off the available feed
 * on the next poll; new incidents pop in on the next poll.
 */

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function responderColor(status: string): string {
  if (status === "available") return "#16a34a";
  if (status === "busy" || status === "responding") return "#f97316";
  if (status === "on_scene") return "#2563eb";
  return "#94a3b8";
}

function incidentColor(priority: string): string {
  if (priority === "critical") return "#dc2626";
  if (priority === "high") return "#ea580c";
  if (priority === "medium") return "#d97706";
  return "#64748b";
}

function responderPopup(marker: PublicResponderMarker): string {
  const name = escapeHtml(marker.displayName || "Responder");
  const status = escapeHtml(marker.availabilityStatus || "");
  const demo = marker.isDemo ? "<br/>(demo)" : "";
  return (
    `<strong>${name}</strong><br/>Status: ${status}${demo}` +
    `<br/><span style="color:#475569;font-size:11px">Approximate location</span>`
  );
}

function incidentPopup(marker: IncidentMarker): string {
  const ref = escapeHtml(marker.publicReference || "Incident");
  const category = escapeHtml((marker.category || "").replaceAll("_", " "));
  const status = escapeHtml((marker.status || "").replaceAll("_", " "));
  const priority = escapeHtml(marker.priority || "");
  const address = escapeHtml(marker.address || "");
  const demo = marker.isDemo ? "<br/>(demo)" : "";
  return (
    `<strong>${ref}</strong> · ${category}` +
    `<br/>Status: ${status} · Priority: ${priority}` +
    (address ? `<br/>${address}` : "") +
    demo +
    `<br/><span style="color:#475569;font-size:11px">Incident — authorised view</span>`
  );
}

export function OperationsMap({
  responders,
  incidents,
  showResponders = true,
  showIncidents = true,
}: {
  responders: PublicResponderMarker[];
  incidents: IncidentMarker[];
  showResponders?: boolean;
  showIncidents?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const respondersRef = useRef(responders);
  const incidentsRef = useRef(incidents);
  const showRespondersRef = useRef(showResponders);
  const showIncidentsRef = useRef(showIncidents);
  const mapRef = useRef<import("maplibre-gl").Map | null>(null);
  const libRef = useRef<typeof import("maplibre-gl") | null>(null);
  const responderMarkers = useRef(new Map<string, import("maplibre-gl").Marker>());
  const incidentMarkers = useRef(new Map<string, import("maplibre-gl").Marker>());
  const syncRef = useRef<(() => void) | null>(null);

  // Keep the latest props available to the long-lived map closure.
  useEffect(() => {
    respondersRef.current = responders;
  }, [responders]);
  useEffect(() => {
    incidentsRef.current = incidents;
  }, [incidents]);
  useEffect(() => {
    showRespondersRef.current = showResponders;
  }, [showResponders]);
  useEffect(() => {
    showIncidentsRef.current = showIncidents;
  }, [showIncidents]);

  // Create the map once.
  useEffect(() => {
    let cancelled = false;
    const responderMap = responderMarkers.current;
    const incidentMap = incidentMarkers.current;

    (async () => {
      const maplibregl = await import("maplibre-gl");
      if (cancelled || !ref.current) return;
      libRef.current = maplibregl;

      const map = new maplibregl.Map({
        container: ref.current,
        style: {
          version: 8,
          sources: {
            osm: {
              type: "raster",
              tiles: [env.mapTilesUrl],
              tileSize: 256,
              attribution: "© OpenStreetMap contributors",
            },
          },
          layers: [{ id: "osm", type: "raster", source: "osm" }],
        },
        center: [SITE.hcmc.lng, SITE.hcmc.lat],
        zoom: SITE.hcmc.zoom,
      });
      mapRef.current = map;
      if (cancelled) {
        map.remove();
        mapRef.current = null;
        return;
      }

      map.addControl(new maplibregl.NavigationControl(), "top-right");
      map.addControl(
        new maplibregl.GeolocateControl({
          positionOptions: { enableHighAccuracy: true },
          trackUserLocation: true,
        }),
        "top-right",
      );

      const sync = () => {
        const m = mapRef.current;
        const lib = libRef.current;
        if (!m || !lib) return;

        // Responders layer.
        const showR = showRespondersRef.current;
        const currentR = showR
          ? respondersRef.current.filter(
              (r) => Number.isFinite(r.lat) && Number.isFinite(r.lng),
            )
          : [];
        const seenR = new Set<string>();
        for (const marker of currentR) {
          seenR.add(marker.id);
          const existing = responderMap.get(marker.id);
          if (existing) {
            existing.setLngLat([marker.lng, marker.lat]);
            const el = existing.getElement();
            if (el) {
              el.style.background = responderColor(marker.availabilityStatus);
              el.title = marker.displayName;
            }
            existing.setPopup(
              new lib.Popup({ offset: 12 }).setHTML(responderPopup(marker)),
            );
          } else {
            const el = document.createElement("div");
            el.style.cssText = `width:16px;height:16px;border-radius:9999px;background:${responderColor(marker.availabilityStatus)};border:2px solid white;box-shadow:0 1px 4px rgba(0,0,0,.35);cursor:pointer;`;
            el.title = marker.displayName;
            const created = new lib.Marker({ element: el })
              .setLngLat([marker.lng, marker.lat])
              .setPopup(
                new lib.Popup({ offset: 12 }).setHTML(responderPopup(marker)),
              )
              .addTo(m);
            responderMap.set(marker.id, created);
          }
        }
        for (const [id, mk] of responderMap.entries()) {
          if (!seenR.has(id)) {
            mk.remove();
            responderMap.delete(id);
          }
        }

        // Incidents layer (larger, priority-coloured).
        const showI = showIncidentsRef.current;
        const currentI = showI
          ? incidentsRef.current.filter(
              (i) => Number.isFinite(i.lat) && Number.isFinite(i.lng),
            )
          : [];
        const seenI = new Set<string>();
        for (const marker of currentI) {
          seenI.add(marker.id);
          const existing = incidentMap.get(marker.id);
          if (existing) {
            existing.setLngLat([marker.lng, marker.lat]);
            const el = existing.getElement();
            if (el) {
              el.style.background = incidentColor(marker.priority);
              el.title = marker.publicReference;
            }
            existing.setPopup(
              new lib.Popup({ offset: 12 }).setHTML(incidentPopup(marker)),
            );
          } else {
            const el = document.createElement("div");
            el.style.cssText = `width:20px;height:20px;border-radius:9999px;background:${incidentColor(marker.priority)};border:2px solid white;box-shadow:0 1px 6px rgba(0,0,0,.45);cursor:pointer;`;
            el.title = marker.publicReference;
            const created = new lib.Marker({ element: el })
              .setLngLat([marker.lng, marker.lat])
              .setPopup(
                new lib.Popup({ offset: 12 }).setHTML(incidentPopup(marker)),
              )
              .addTo(m);
            incidentMap.set(marker.id, created);
          }
        }
        for (const [id, mk] of incidentMap.entries()) {
          if (!seenI.has(id)) {
            mk.remove();
            incidentMap.delete(id);
          }
        }
      };
      syncRef.current = sync;
      sync();
    })();

    return () => {
      cancelled = true;
      syncRef.current = null;
      for (const mk of responderMap.values()) mk.remove();
      responderMap.clear();
      for (const mk of incidentMap.values()) mk.remove();
      incidentMap.clear();
      mapRef.current?.remove();
      mapRef.current = null;
      libRef.current = null;
    };
  }, []);

  // Push polled updates (and layer toggles) into the live markers.
  useEffect(() => {
    syncRef.current?.();
  }, [responders, incidents, showResponders, showIncidents]);

  return (
    <div>
      <div
        ref={ref}
        className="h-[70vh] min-h-[420px] w-full rounded-xl border border-slate-200"
        role="application"
        aria-label="Operations map showing active incidents and approximate responder locations"
      />
      <ul className="mt-3 flex flex-wrap gap-4 text-xs text-slate-600">
        <li>
          <span className="mr-1 inline-block h-4 w-4 rounded-full border-2 border-white bg-red-600 align-middle shadow" />
          Critical incident
        </li>
        <li>
          <span className="mr-1 inline-block h-4 w-4 rounded-full border-2 border-white bg-orange-600 align-middle shadow" />
          High incident
        </li>
        <li>
          <span className="mr-1 inline-block h-4 w-4 rounded-full border-2 border-white bg-amber-600 align-middle shadow" />
          Medium incident
        </li>
        <li>
          <span className="mr-1 inline-block h-3 w-3 rounded-full bg-green-600 align-middle" />
          Responder available
        </li>
        <li>
          <span className="mr-1 inline-block h-3 w-3 rounded-full bg-orange-500 align-middle" />
          Responder responding
        </li>
        <li>
          <span className="mr-1 inline-block h-3 w-3 rounded-full bg-slate-400 align-middle" />
          Grey: offline / stale
        </li>
      </ul>
      <p className="mt-2 text-xs text-slate-500">
        Incidents show operational locations (authorised view only, refreshed
        live). Responder positions are privacy-offset approximations. In an
        emergency call police {EMERGENCY_NUMBERS.police}, fire{" "}
        {EMERGENCY_NUMBERS.fire}, or medical {EMERGENCY_NUMBERS.ambulance}{" "}
        first.
      </p>
    </div>
  );
}
