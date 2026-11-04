"use client";

import { useQuery } from "@tanstack/react-query";
import { ResponderMap } from "@/components/map/responder-map";
import type { PublicResponderMarker } from "@/lib/types";

export default function AdminMapPage() {
  const { data } = useQuery({
    queryKey: ["admin-map"],
    queryFn: async (): Promise<PublicResponderMarker[]> => {
      const res = await fetch("/api/v1/map/responders");
      const json = (await res.json()) as {
        data: { markers: PublicResponderMarker[] };
      };
      return json.data.markers;
    },
  });

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Operations map</h1>
      <p className="text-sm text-slate-600">
        Authorised operational view. Exact coordinates remain server-side;
        markers here are the same privacy-protected feed as the public map.
      </p>
      <ResponderMap markers={data ?? []} />
    </div>
  );
}
