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
 * Live-update friendly: the MapLibre map is created once; polled prop changes
 * update both GeoJSON sources in place (no remount, pan/zoom preserved).
 * When an incident is dealt with (RESOLVED/CANCELLED/FALSE_REPORT) it drops
 * off the available feed on the next poll; new incidents pop in on the next
 * poll.
 */

const RESPONDER_SOURCE = "op-responders";
const RESPONDER_LAYER = "op-responders-circle";
const INCIDENT_SOURCE = "op-incidents";
const INCIDENT_LAYER = "op-incidents-circle";

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function responderCollection(markers: PublicResponderMarker[]) {
  return {
    type: "FeatureCollection" as const,
    features: markers
      .filter((m) => Number.isFinite(m.lat) && Number.isFinite(m.lng))
      .map((m) => ({
        type: "Feature" as const,
        geometry: { type: "Point" as const, coordinates: [m.lng, m.lat] },
        properties: {
          id: m.id,
          displayName: m.displayName,
          availabilityStatus: m.availabilityStatus,
          isDemo: m.isDemo ? true : false,
        },
      })),
  };
}

function incidentCollection(incidents: IncidentMarker[]) {
  return {
    type: "FeatureCollection" as const,
    features: incidents
      .filter((i) => Number.isFinite(i.lat) && Number.isFinite(i.lng))
      .map((i) => ({
        type: "Feature" as const,
        geometry: { type: "Point" as const, coordinates: [i.lng, i.lat] },
        properties: {
          id: i.id,
          publicReference: i.publicReference,
          category: i.category,
          status: i.status,
          priority: i.priority,
          address: i.address ?? "",
          createdAt: i.createdAt,
          isDemo: i.isDemo ? true : false,
        },
      })),
  };
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
  const updateRef = useRef<(() => void) | null>(null);

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

  useEffect(() => {
    let map: import("maplibre-gl").Map | null = null;
    let popup: import("maplibre-gl").Popup | null = null;
    let cancelled = false;

    (async () => {
      const maplibregl = await import("maplibre-gl");
      if (cancelled || !ref.current) return;

      map = new maplibregl.Map({
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

      if (cancelled) return;
      const m: import("maplibre-gl").Map = map;
      m.addControl(new maplibregl.NavigationControl(), "top-right");
      m.addControl(
        new maplibregl.GeolocateControl({
          positionOptions: { enableHighAccuracy: true },
          trackUserLocation: true,
        }),
        "top-right",
      );

      const updateSources = () => {
        (m.getSource(RESPONDER_SOURCE) as
          | import("maplibre-gl").GeoJSONSource
          | undefined
        )?.setData(
          responderCollection(
            showRespondersRef.current ? respondersRef.current : [],
          ) as never,
        );
        (m.getSource(INCIDENT_SOURCE) as
          | import("maplibre-gl").GeoJSONSource
          | undefined
        )?.setData(
          incidentCollection(
            showIncidentsRef.current ? incidentsRef.current : [],
          ) as never,
        );
      };
      updateRef.current = updateSources;

      const initLayers = () => {
        if (cancelled) return;
        if (!m.getSource(RESPONDER_SOURCE)) {
          m.addSource(RESPONDER_SOURCE, {
            type: "geojson",
            data: responderCollection(respondersRef.current) as never,
          });
          m.addLayer({
            id: RESPONDER_LAYER,
            type: "circle",
            source: RESPONDER_SOURCE,
            paint: {
              "circle-radius": 7,
              "circle-color": [
                "match",
                ["get", "availabilityStatus"],
                "available",
                "#16a34a",
                "busy",
                "#f97316",
                "responding",
                "#f97316",
                "on_scene",
                "#2563eb",
                "#94a3b8",
              ],
              "circle-stroke-width": 2,
              "circle-stroke-color": "#ffffff",
            },
          });
        }
        if (!m.getSource(INCIDENT_SOURCE)) {
          m.addSource(INCIDENT_SOURCE, {
            type: "geojson",
            data: incidentCollection(incidentsRef.current) as never,
          });
          m.addLayer({
            id: INCIDENT_LAYER,
            type: "circle",
            source: INCIDENT_SOURCE,
            paint: {
              "circle-radius": 11,
              // Incidents are coloured by priority (triage).
              "circle-color": [
                "match",
                ["get", "priority"],
                "critical",
                "#dc2626",
                "high",
                "#ea580c",
                "medium",
                "#d97706",
                "#64748b",
              ],
              "circle-stroke-width": 2,
              "circle-stroke-color": "#ffffff",
            },
          });
        }
        updateSources();

        m.on("click", INCIDENT_LAYER, (e) => {
          const features = e.features ?? [];
          if (features.length === 0) return;
          const props = features[0].properties as Record<string, unknown>;
          const geometry = features[0].geometry as unknown as {
            coordinates: [number, number];
          };
          const ref = escapeHtml(String(props.publicReference ?? "Incident"));
          const status = escapeHtml(String(props.status ?? "").replaceAll("_", " "));
          const priority = escapeHtml(String(props.priority ?? ""));
          const category = escapeHtml(String(props.category ?? "").replaceAll("_", " "));
          const address = escapeHtml(String(props.address ?? ""));
          const demo = props.isDemo === true ? "<br/>(demo)" : "";
          popup?.remove();
          popup = new maplibregl.Popup({ offset: 12 })
            .setLngLat(geometry.coordinates)
            .setHTML(
              `<strong>${ref}</strong> · ${category}` +
                `<br/>Status: ${status} · Priority: ${priority}` +
                (address ? `<br/>${address}` : "") +
                demo +
                `<br/><span style="color:#475569;font-size:11px">Incident — authorised view</span>`,
            )
            .addTo(m);
        });

        m.on("click", RESPONDER_LAYER, (e) => {
          const features = e.features ?? [];
          if (features.length === 0) return;
          const props = features[0].properties as Record<string, unknown>;
          const geometry = features[0].geometry as unknown as {
            coordinates: [number, number];
          };
          const name = escapeHtml(String(props.displayName ?? "Responder"));
          const status = escapeHtml(String(props.availabilityStatus ?? ""));
          const demo = props.isDemo === true ? "<br/>(demo)" : "";
          popup?.remove();
          popup = new maplibregl.Popup({ offset: 12 })
            .setLngLat(geometry.coordinates)
            .setHTML(
              `<strong>${name}</strong><br/>Status: ${status}${demo}` +
                `<br/><span style="color:#475569;font-size:11px">Approximate location</span>`,
            )
            .addTo(m);
        });

        m.on("mouseenter", INCIDENT_LAYER, () => {
          m.getCanvas().style.cursor = "pointer";
        });
        m.on("mouseleave", INCIDENT_LAYER, () => {
          m.getCanvas().style.cursor = "";
        });
        m.on("mouseenter", RESPONDER_LAYER, () => {
          m.getCanvas().style.cursor = "pointer";
        });
        m.on("mouseleave", RESPONDER_LAYER, () => {
          m.getCanvas().style.cursor = "";
        });
      };

      if (m.isStyleLoaded()) {
        initLayers();
      } else {
        m.once("load", initLayers);
      }
    })();

    return () => {
      cancelled = true;
      updateRef.current = null;
      popup?.remove();
      map?.remove();
    };
  }, []);

  useEffect(() => {
    updateRef.current?.();
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
