"use client";

import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { ResponderMap } from "@/components/map/responder-map";
import type { PublicResponderMarker } from "@/lib/types";
import { SITE } from "@/lib/constants";
import { Badge } from "@/components/ui/badge";

const DEMO_MARKERS: PublicResponderMarker[] = [
  { id: "demo-1", displayName: "Volunteer — District 1 (demo)", lat: 10.7769, lng: 106.7008, availabilityStatus: "available", qualifications: ["first_aid"], isDemo: true },
  { id: "demo-2", displayName: "Volunteer — District 3 (demo)", lat: 10.7829, lng: 106.6995, availabilityStatus: "responding", qualifications: ["first_aid", "traffic"], isDemo: true },
  { id: "demo-3", displayName: "Volunteer — Thủ Đức (demo)", lat: 10.8491, lng: 106.6372, availabilityStatus: "available", qualifications: ["first_aid", "water_rescue"], isDemo: true },
  { id: "demo-4", displayName: "Volunteer — Quận 7 (demo)", lat: 10.7308, lng: 106.6930, availabilityStatus: "on_scene", qualifications: ["first_aid"], isDemo: true },
  { id: "demo-5", displayName: "Volunteer — Gò Vấp (demo)", lat: 10.8385, lng: 106.6534, availabilityStatus: "offline", qualifications: ["traffic"], isDemo: true },
];

/**
 * Public responder map — responders only (never incidents), live-updating.
 * Polls the privacy-protected approx feed every 15s; pauses when the tab is
 * hidden and refetches on window focus. Incident locations are never fetched
 * or rendered here.
 */
export default function MapPage() {
  const [filter, setFilter] = useState<string>("all");

  const { data, isError, dataUpdatedAt, isFetching } = useQuery({
    queryKey: ["public-responders"],
    queryFn: async (): Promise<{
      markers: PublicResponderMarker[];
      demo: boolean;
    }> => {
      const res = await fetch("/api/v1/map/responders");
      if (!res.ok) throw new Error("Failed to load responders");
      const json = (await res.json()) as {
        data: { markers: PublicResponderMarker[]; demo?: boolean };
      };
      // demo:true only when backend not configured (dev placeholder).
      // Configured production with [] is live-empty (no fake markers).
      return {
        markers: json.data.markers ?? [],
        demo: json.data.demo === true,
      };
    },
    refetchInterval: 15_000,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true,
  });

  const markers = useMemo(() => {
    const live = data?.markers ?? [];
    // Demo simulation only when the API explicitly says the backend is not
    // configured; live-empty stays empty (no fake markers in production).
    const source = data?.demo ? DEMO_MARKERS : live;
    return filter === "all"
      ? source
      : source.filter((m) => m.availabilityStatus === filter);
  }, [data, filter]);

  const usingDemo = data?.demo === true;

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">
            Responder map — {SITE.city}
          </h1>
          <p className="mt-1 max-w-2xl text-slate-600">
            Verified volunteers who opted into public visibility. Positions are
            approximate and privacy-protected; exact live GPS is never public.
            Responders only — incidents are never shown here.
          </p>
          <p className="mt-1 text-xs text-slate-500">
            <Badge tone="green">● Live</Badge>{" "}
            <span className="ml-2">
              {isFetching ? "Updating…" : "Updates every 15s"}
              {dataUpdatedAt
                ? ` · last updated ${new Date(dataUpdatedAt).toLocaleTimeString()}`
                : ""}
            </span>
          </p>
        </div>
        {usingDemo && (
          <Badge tone="orange">
            Demo data — labelled simulation (no live responders connected)
          </Badge>
        )}
      </div>

      <div className="mt-4 flex flex-wrap gap-2 text-sm">
        {["all", "available", "responding", "on_scene", "offline"].map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setFilter(s)}
            aria-pressed={filter === s}
            className={`rounded-full border px-3 py-1 text-xs font-semibold ${
              filter === s
                ? "border-[#0b2545] bg-[#0b2545] text-white"
                : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      {!usingDemo && data && (data.markers?.length ?? 0) === 0 && !isError && (
        <p className="mt-4 rounded-md border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
          No live responders on duty right now. Responder markers appear here
          when verified responders go on duty with location sharing. In an
          emergency, call 113 / 114 / 115.
        </p>
      )}

      {isError && (
        <p className="mt-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          Live responder feed is unavailable right now. Responder markers are
          hidden until the live feed recovers. In an emergency, call 113 / 114 /
          115.
        </p>
      )}

      <div className="mt-4">
        <ResponderMap markers={markers} />
      </div>
    </div>
  );
}
