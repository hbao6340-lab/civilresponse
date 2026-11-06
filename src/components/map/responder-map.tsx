"use client";

import { useEffect, useRef } from "react";
import type { PublicResponderMarker } from "@/lib/types";
import { SITE, EMERGENCY_NUMBERS } from "@/lib/constants";
import { env } from "@/lib/env";

/**
 * Public responder map — responders only (never incidents).
 *
 * Live-update friendly: the MapLibre map is created once; subsequent
 * `markers` prop changes update the GeoJSON source in place (no remount),
 * so polling feeds animate without losing pan/zoom. Coordinates are the
 * privacy-protected approximations from /api/v1/map/responders.
 */

const SOURCE_ID = "responders-src";
const LAYER_ID = "responders-circle";

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function toFeatureCollection(markers: PublicResponderMarker[]) {
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
          distance: m.distanceMeters,
          isDemo: m.isDemo ? true : false,
        },
      })),
  };
}

export function ResponderMap({ markers }: { markers: PublicResponderMarker[] }) {
  const ref = useRef<HTMLDivElement>(null);
  const markersRef = useRef(markers);
  const updateRef = useRef<(() => void) | null>(null);

  // Keep the latest markers available to the long-lived map closure.
  useEffect(() => {
    markersRef.current = markers;
  }, [markers]);

  // Create the map once; layers initialise on style load, then updates flow
  // through the second effect without remounting.
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

      const updateSource = () => {
        const source = m.getSource(SOURCE_ID) as
          | import("maplibre-gl").GeoJSONSource
          | undefined;
        source?.setData(toFeatureCollection(markersRef.current) as never);
      };
      updateRef.current = updateSource;

      const initLayers = () => {
        if (cancelled) return;
        if (!m.getSource(SOURCE_ID)) {
          m.addSource(SOURCE_ID, {
            type: "geojson",
            data: toFeatureCollection(markersRef.current) as never,
          });
          m.addLayer({
            id: LAYER_ID,
            type: "circle",
            source: SOURCE_ID,
            paint: {
              "circle-radius": 8,
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
        updateSource();

        m.on("click", LAYER_ID, (e) => {
          const features = e.features ?? [];
          if (features.length === 0) return;
          const props = features[0].properties as Record<string, unknown>;
          const geometry = features[0].geometry as unknown as {
            coordinates: [number, number];
          };
          const name = escapeHtml(String(props.displayName ?? "Responder"));
          const status = escapeHtml(String(props.availabilityStatus ?? ""));
          const distance =
            typeof props.distance === "number" && Number.isFinite(props.distance)
              ? `<br/>~${(props.distance / 1000).toFixed(1)} km away (approx.)`
              : "";
          const demo = props.isDemo === true ? "<br/>(demo)" : "";
          popup?.remove();
          popup = new maplibregl.Popup({ offset: 12 })
            .setLngLat(geometry.coordinates)
            .setHTML(
              `<strong>${name}</strong><br/>Status: ${status}${distance}${demo}` +
                `<br/><span style="color:#475569;font-size:11px">Approximate location</span>`,
            )
            .addTo(m);
        });

        m.on("mouseenter", LAYER_ID, () => {
          m.getCanvas().style.cursor = "pointer";
        });
        m.on("mouseleave", LAYER_ID, () => {
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

  // Push polled marker updates into the existing source (no remount).
  useEffect(() => {
    updateRef.current?.();
  }, [markers]);

  return (
    <div>
      <div
        ref={ref}
        className="h-[70vh] min-h-[420px] w-full rounded-xl border border-slate-200"
        role="application"
        aria-label="Interactive map of Ho Chi Minh City showing approximate responder locations"
      />
      <ul className="mt-3 flex flex-wrap gap-4 text-xs text-slate-600">
        <li>
          <span className="mr-1 inline-block h-3 w-3 rounded-full bg-green-600" />
          Green: available
        </li>
        <li>
          <span className="mr-1 inline-block h-3 w-3 rounded-full bg-orange-500" />
          Orange: responding
        </li>
        <li>
          <span className="mr-1 inline-block h-3 w-3 rounded-full bg-blue-600" />
          Blue: on scene
        </li>
        <li>
          <span className="mr-1 inline-block h-3 w-3 rounded-full bg-slate-400" />
          Grey: offline / stale
        </li>
      </ul>
      <p className="mt-2 text-xs text-slate-500">
        Positions are privacy-offset approximations. Responders only — incidents
        are never shown on the public map. In an emergency call police{" "}
        {EMERGENCY_NUMBERS.police}, fire {EMERGENCY_NUMBERS.fire}, or medical{" "}
        {EMERGENCY_NUMBERS.ambulance} first.
      </p>
    </div>
  );
}
