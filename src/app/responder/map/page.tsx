"use client";

import { OperationsMapView } from "@/components/map/operations-map-view";

/**
 * Responder dashboard Map tab — same live operations view as the control
 * center: all available incidents + approximate responders. Only verified
 * responders and staff reach this page (the layout hides the link otherwise;
 * the API enforces the same rule).
 */
export default function ResponderMapPage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Operations map</h1>
        <p className="text-sm text-slate-600">
          All available (active) incidents plus approximate responder locations.
          New incidents appear live; resolved / cancelled incidents drop off on
          the next refresh.
        </p>
      </div>
      <OperationsMapView />
    </div>
  );
}
