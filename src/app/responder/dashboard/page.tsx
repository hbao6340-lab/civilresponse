"use client";

import { useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { GpsTracker, haversineMeters, type PositionFix } from "@/lib/geo";
import { GPS } from "@/lib/constants";

/** Responder dashboard with prominent duty-mode control and live GPS. */
export default function ResponderDashboardPage() {
  const [dutyOverride, setDutyOverride] = useState<boolean | null>(null);
  const [fix, setFix] = useState<PositionFix | null>(null);
  const [lastSent, setLastSent] = useState<number | null>(null);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const lastSentRef = useRef(0);
  const trackerStopRef = useRef<(() => void) | null>(null);

  const { data: stateData } = useQuery({
    queryKey: ["responder-state"],
    queryFn: async () => {
      const res = await fetch("/api/v1/responders/me");
      if (!res.ok) return null;
      return (await res.json()) as {
        data: {
          verificationStatus: string;
          dutyMode: boolean;
          availabilityStatus: string;
          locationSharingEnabled: boolean;
          publicVisibility: boolean;
        };
      };
    },
  });

  // Duty state mirrors the server record while the query is live. Derived
  // directly from cache (no effect): user toggles write optimistically via
  // setQueryData below.
  const serverDuty = stateData?.data?.dutyMode ?? false;
  const duty = dutyOverride ?? serverDuty;

  const sendFix = async (f: PositionFix) => {
    setFix(f);
    // Cadence: move frequently, stand still slowly.
    const prev = sentFixRef.current;
    const moved =
      prev != null
        ? haversineMeters(
            { lat: prev.latitude, lng: prev.longitude },
            { lat: f.latitude, lng: f.longitude },
          )
        : Infinity;
    const interval =
      moved >= GPS.movementThresholdM
        ? GPS.movingIntervalMs
        : GPS.stationaryIntervalMs;
    if (Date.now() - lastSentRef.current < interval && prev != null) return;
    lastSentRef.current = Date.now();
    sentFixRef.current = f;
    try {
      const res = await fetch("/api/v1/gps/updates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          latitude: f.latitude,
          longitude: f.longitude,
          accuracyMeters: f.accuracyMeters,
          heading: f.heading,
          speedMetersPerSecond: f.speedMetersPerSecond,
        }),
      });
      if (res.ok) setLastSent(Date.now());
    } catch {
      // Offline — next watch tick will retry.
    }
  };
  const sentFixRef = useRef<PositionFix | null>(null);

  const toggleDuty = async (next: boolean) => {
    setDutyOverride(next);
    try {
      await fetch("/api/v1/responders/duty", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dutyMode: next }),
      });
    } catch {
      // Reconciled on next visit.
    }

    if (next) {
      try {
        const tracker = new GpsTracker();
        const stop = tracker.start(
          (f) => {
            void sendFix(f);
          },
          (e) => setGpsError(e.message),
        );
        trackerStopRef.current = stop;
      } catch (e) {
        setGpsError(e instanceof Error ? e.message : "Geolocation unavailable.");
      }
    } else {
      trackerStopRef.current?.();
      trackerStopRef.current = null;
      setFix(null);
      sentFixRef.current = null;
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Responder dashboard</h1>
        <p className="text-sm text-slate-600">
          Duty mode gates everything: verified status, consent, and browser
          location permission must all be active before GPS flows.
        </p>
      </div>

      <Card className={duty ? "border-emerald-300" : ""}>
        <CardBody>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold">Duty mode</p>
              <p className="text-sm text-slate-600">
                {duty
                  ? "On duty — GPS sharing (if consented) and incident alerts are live."
                  : "Off duty — no GPS is collected and you will not receive alerts."}
              </p>
            </div>
            <Badge tone={duty ? "green" : "grey"}>{duty ? "ON DUTY" : "OFF DUTY"}</Badge>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button
              variant={duty ? "danger" : "primary"}
              onClick={() => void toggleDuty(!duty)}
            >
              {duty ? "Go off duty" : "Go on duty"}
            </Button>
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader
          title="Live GPS"
          description={`Moving: ~${GPS.movingIntervalMs / 1000}s · Stationary: ~${GPS.stationaryIntervalMs / 1000}s · Stale after ${GPS.maxFreshMs / 1000}s. Browser background tracking is NOT offered — closing the browser stops sharing.`}
        />
        <CardBody>
          {gpsError && <p className="mb-2 text-sm text-red-700">{gpsError}</p>}
          {fix ? (
            <dl className="grid gap-2 text-sm sm:grid-cols-2">
              <div><dt className="text-slate-500">Position</dt><dd>{fix.latitude.toFixed(5)}, {fix.longitude.toFixed(5)}</dd></div>
              <div><dt className="text-slate-500">Accuracy</dt><dd>{fix.accuracyMeters ? `±${Math.round(fix.accuracyMeters)} m` : "—"}</dd></div>
              <div><dt className="text-slate-500">Last fix</dt><dd>{new Date(fix.timestamp).toLocaleTimeString()}</dd></div>
              <div><dt className="text-slate-500">Last sent</dt><dd>{lastSent ? new Date(lastSent).toLocaleTimeString() : "—"}</dd></div>
            </dl>
          ) : (
            <p className="text-sm text-slate-500">
              {duty
                ? "Waiting for the first GPS fix… grant location permission if prompted."
                : "GPS is off. Go on duty and grant location access to start sharing."}
            </p>
          )}
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Availability" description="Set your state so dispatch can rank you correctly." />
        <CardBody>
          <p className="text-sm text-slate-600">
            Open Settings to change availability, location-sharing consent,
            and public-map visibility.
          </p>
        </CardBody>
      </Card>
    </div>
  );
}
