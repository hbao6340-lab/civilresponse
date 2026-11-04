"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  INCIDENT_CATEGORIES,
  INCIDENT_CATEGORY_LABEL,
  EMERGENCY_NUMBERS,
} from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardBody } from "@/components/ui/card";
import { GpsTracker, type PositionFix } from "@/lib/geo";

export default function ReportPage() {
  const router = useRouter();
  const [category, setCategory] = useState<(typeof INCIDENT_CATEGORIES)[number]>(
    "other",
  );
  const [description, setDescription] = useState("");
  const [address, setAddress] = useState("");
  const [affected, setAffected] = useState("");
  const [contact, setContact] = useState("");
  const [fix, setFix] = useState<PositionFix | null>(null);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const captureLocation = () => {
    setGpsError(null);
    try {
      const tracker = new GpsTracker();
      tracker.start(
        (f) => {
          setFix(f);
          tracker.stop();
        },
        (e) => setGpsError(e.message),
      );
    } catch (e) {
      setGpsError(e instanceof Error ? e.message : "Geolocation unavailable.");
    }
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!fix) {
      setError("Please attach your location (GPS) or enter an address.");
      return;
    }
    if (!consent) {
      setError("Please acknowledge the privacy notice.");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/v1/incidents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category,
          description,
          latitude: fix.latitude,
          longitude: fix.longitude,
          address: address || null,
          affectedPersons: affected ? Number(affected) : null,
          contactDetails: contact || null,
          consent: true,
        }),
      });
      const json = (await res.json()) as {
        success: boolean;
        data?: { publicReference: string; trackingToken: string };
        error?: { message: string };
      };
      if (!res.ok || !json.success || !json.data) {
        setError(json.error?.message ?? "Could not submit your report.");
        setBusy(false);
        return;
      }
      const { publicReference, trackingToken } = json.data;
      router.push(
        `/incident/${encodeURIComponent(publicReference)}/${encodeURIComponent(trackingToken)}`,
      );
    } catch {
      setError("Network error. If this is urgent, call 113 / 114 / 115 now.");
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="text-3xl font-bold text-slate-900">Report an emergency</h1>
      <p className="mt-1 text-slate-600">
        No account needed. If anyone is in immediate danger, call police{" "}
        {EMERGENCY_NUMBERS.police}, fire {EMERGENCY_NUMBERS.fire}, or medical{" "}
        {EMERGENCY_NUMBERS.ambulance} <strong>first</strong> — then file a
        report here to let nearby community responders help.
      </p>

      <Card className="mt-6">
        <CardHeader title="Incident report" description="Keep it factual and specific. Optional photos can be added after submission." />
        <CardBody>
          <form onSubmit={submit} className="space-y-5">
            {error && (
              <p role="alert" className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">
                {error}
              </p>
            )}

            <div>
              <label htmlFor="category" className="mb-1 block text-sm font-semibold">
                Category
              </label>
              <select
                id="category"
                value={category}
                onChange={(e) =>
                  setCategory(e.target.value as typeof category)
                }
                className="w-full rounded-md border border-slate-300 px-3 py-2"
              >
                {INCIDENT_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {INCIDENT_CATEGORY_LABEL[c]}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="description" className="mb-1 block text-sm font-semibold">
                What is happening? (at least 10 characters)
              </label>
              <textarea
                id="description"
                required
                minLength={10}
                maxLength={4000}
                rows={4}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full rounded-md border border-slate-300 px-3 py-2"
                placeholder="e.g. Two motorbikes collided near the bridge; one person lying on the road, conscious."
              />
            </div>

            <div>
              <span className="mb-1 block text-sm font-semibold">Location</span>
              <div className="flex flex-wrap items-center gap-2">
                <Button type="button" variant="secondary" onClick={captureLocation}>
                  Attach GPS location
                </Button>
                {fix && (
                  <span className="text-sm text-emerald-800">
                    {fix.latitude.toFixed(5)}, {fix.longitude.toFixed(5)}
                    {fix.accuracyMeters ? ` (±${Math.round(fix.accuracyMeters)} m)` : ""}
                  </span>
                )}
              </div>
              {gpsError && (
                <p className="mt-1 text-sm text-red-700">{gpsError}</p>
              )}
              <input
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Address or landmark (optional but helpful)"
                className="mt-2 w-full rounded-md border border-slate-300 px-3 py-2"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="affected" className="mb-1 block text-sm font-semibold">
                  People affected (if known)
                </label>
                <input
                  id="affected"
                  type="number"
                  min={0}
                  value={affected}
                  onChange={(e) => setAffected(e.target.value)}
                  className="w-full rounded-md border border-slate-300 px-3 py-2"
                />
              </div>
              <div>
                <label htmlFor="contact" className="mb-1 block text-sm font-semibold">
                  Contact details (optional)
                </label>
                <input
                  id="contact"
                  value={contact}
                  onChange={(e) => setContact(e.target.value)}
                  className="w-full rounded-md border border-slate-300 px-3 py-2"
                  placeholder="Phone (shared only with assigned responders)"
                />
              </div>
            </div>

            <label className="flex items-start gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={consent}
                onChange={(e) => setConsent(e.target.checked)}
                className="mt-1"
              />
              I acknowledge the{" "}
              <a className="underline" href="/privacy">
                privacy notice
              </a>{" "}
              and understand CIVIRESPOND is a community platform — it does not
              replace official emergency services.
            </label>

            <Button type="submit" disabled={busy} className="w-full sm:w-auto">
              {busy ? "Submitting…" : "Submit report"}
            </Button>
          </form>
        </CardBody>
      </Card>
    </div>
  );
}
