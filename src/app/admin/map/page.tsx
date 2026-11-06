"use client";

import { OperationsMapView } from "@/components/map/operations-map-view";

export default function AdminMapPage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Operations map</h1>
        <p className="text-sm text-slate-600">
          All available (active) incidents plus approximate responder locations.
          Incidents pop in when reported and drop off when dealt with
          (resolved / cancelled / false report). Incidents use exact
          operational coordinates (authorised view only); responder positions
          remain privacy-protected approximations.
        </p>
      </div>
      <OperationsMapView />
    </div>
  );
}
