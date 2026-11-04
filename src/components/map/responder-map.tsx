"use client";

import { useEffect, useRef } from "react";
import type { PublicResponderMarker } from "@/lib/types";
import { SITE, EMERGENCY_NUMBERS } from "@/lib/constants";
import { env } from "@/lib/env";

/**
 * MapLibre GL responder map (privacy-protected coordinates only).
 * The public API returns jittered positions; exact GPS never reaches the browser.
 */
export function ResponderMap({ markers }: { markers: PublicResponderMarker[] }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let map: import("maplibre-gl").Map | null = null;
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

      const colorFor = (status: string) =>
        status === "available"
          ? "#16a34a"
          : status === "busy" || status === "responding"
            ? "#f97316"
            : status === "on_scene"
              ? "#2563eb"
              : "#94a3b8";

      for (const marker of markers) {
        const el = document.createElement("div");
        el.style.cssText = `width:16px;height:16px;border-radius:9999px;background:${colorFor(marker.availabilityStatus)};border:2px solid white;box-shadow:0 1px 4px rgba(0,0,0,.35);`;
        el.title = marker.displayName;
        new maplibregl.Marker({ element: el })
          .setLngLat([marker.lng, marker.lat])
          .setPopup(
            new maplibregl.Popup({ offset: 12 }).setHTML(
              `<strong>${marker.displayName}</strong><br/>Status: ${marker.availabilityStatus}` +
                (marker.distanceMeters !== undefined
                  ? `<br/>~${(marker.distanceMeters / 1000).toFixed(1)} km away (approx.)`
                  : "") +
                `<br/><span style="color:#475569;font-size:11px">Approximate location</span>`,
            ),
          )
          .addTo(m);
      }
    })();

    return () => {
      cancelled = true;
      map?.remove();
    };
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
        Positions are privacy-offset approximations. In an emergency call
        police {EMERGENCY_NUMBERS.police}, fire {EMERGENCY_NUMBERS.fire}, or
        medical {EMERGENCY_NUMBERS.ambulance} first.
      </p>
    </div>
  );
}
