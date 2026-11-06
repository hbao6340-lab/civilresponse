"use client";

import { useEffect, useRef } from "react";
import type { PublicResponderMarker } from "@/lib/types";
import { SITE, EMERGENCY_NUMBERS } from "@/lib/constants";
import { env } from "@/lib/env";

/**
 * Public responder map — responders only (never incidents).
 *
 * Live-update friendly: the MapLibre map instance is created once; polled
 * `markers` prop changes are applied in place (markers added / moved /
 * removed) without remounting, so pan/zoom is preserved. Uses the Marker
 * API (DOM elements) which reliably renders privacy-protected approx
 * positions from /api/v1/map/responders.
 */

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function colorFor(status: string): string {
  if (status === "available") return "#16a34a";
  if (status === "busy" || status === "responding") return "#f97316";
  if (status === "on_scene") return "#2563eb";
  return "#94a3b8";
}

function popupHtml(marker: PublicResponderMarker): string {
  const name = escapeHtml(marker.displayName || "Responder");
  const status = escapeHtml(marker.availabilityStatus || "");
  const distance =
    typeof marker.distanceMeters === "number" &&
    Number.isFinite(marker.distanceMeters)
      ? `<br/>~${(marker.distanceMeters / 1000).toFixed(1)} km away (approx.)`
      : "";
  const demo = marker.isDemo ? "<br/>(demo)" : "";
  return (
    `<strong>${name}</strong><br/>Status: ${status}${distance}${demo}` +
    `<br/><span style="color:#475569;font-size:11px">Approximate location</span>`
  );
}

function markerElement(marker: PublicResponderMarker): HTMLDivElement {
  const el = document.createElement("div");
  el.style.cssText = `width:16px;height:16px;border-radius:9999px;background:${colorFor(marker.availabilityStatus)};border:2px solid white;box-shadow:0 1px 4px rgba(0,0,0,.35);cursor:pointer;`;
  el.title = marker.displayName;
  return el;
}

export function ResponderMap({ markers }: { markers: PublicResponderMarker[] }) {
  const ref = useRef<HTMLDivElement>(null);
  const markersRef = useRef(markers);
  const mapRef = useRef<import("maplibre-gl").Map | null>(null);
  const libRef = useRef<typeof import("maplibre-gl") | null>(null);
  const markerRefs = useRef(
    new Map<string, import("maplibre-gl").Marker>(),
  );
  const syncRef = useRef<(() => void) | null>(null);

  // Keep the latest markers available to the long-lived map closure.
  useEffect(() => {
    markersRef.current = markers;
  }, [markers]);

  // Create the map once.
  useEffect(() => {
    let cancelled = false;
    const markersMap = markerRefs.current;

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
        const current = markersRef.current.filter(
          (mk) => Number.isFinite(mk.lat) && Number.isFinite(mk.lng),
        );
        const seen = new Set<string>();
        for (const marker of current) {
          seen.add(marker.id);
          const existing = markersMap.get(marker.id);
          if (existing) {
            existing.setLngLat([marker.lng, marker.lat]);
            const el = existing.getElement();
            if (el) {
              el.style.background = colorFor(marker.availabilityStatus);
              el.title = marker.displayName;
            }
            existing.setPopup(
              new lib.Popup({ offset: 12 }).setHTML(popupHtml(marker)),
            );
          } else {
            const created = new lib.Marker({ element: markerElement(marker) })
              .setLngLat([marker.lng, marker.lat])
              .setPopup(new lib.Popup({ offset: 12 }).setHTML(popupHtml(marker)))
              .addTo(m);
            markersMap.set(marker.id, created);
          }
        }
        for (const [id, mk] of markersMap.entries()) {
          if (!seen.has(id)) {
            mk.remove();
            markersMap.delete(id);
          }
        }
      };
      syncRef.current = sync;
      sync();
    })();

    return () => {
      cancelled = true;
      syncRef.current = null;
      for (const mk of markersMap.values()) mk.remove();
      markersMap.clear();
      mapRef.current?.remove();
      mapRef.current = null;
      libRef.current = null;
    };
  }, []);

  // Push polled updates into the live markers (no remount).
  useEffect(() => {
    syncRef.current?.();
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
