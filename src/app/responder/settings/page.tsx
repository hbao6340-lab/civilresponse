"use client";

import { useState } from "react";
import { Card, CardHeader, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function ResponderSettingsPage() {
  const [availability, setAvailability] = useState("available");
  const [locationSharing, setLocationSharing] = useState(false);
  const [publicVis, setPublicVis] = useState(false);
  const [done, setDone] = useState<string | null>(null);

  const save = async () => {
    try {
      const res = await fetch("/api/v1/responders/duty", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          availabilityStatus: availability,
          locationSharingEnabled: locationSharing,
          publicVisibility: publicVis,
        }),
      });
      setDone(res.ok ? "Settings saved." : "Could not save settings.");
    } catch {
      setDone("Network error.");
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Settings</h1>
      <Card>
        <CardHeader title="Availability & privacy" description="Location sharing and public visibility are separate, explicit consents." />
        <CardBody className="space-y-4">
          {done && <p className="text-sm text-emerald-800">{done}</p>}
          <label className="block text-sm font-semibold">
            Availability
            <select
              value={availability}
              onChange={(e) => setAvailability(e.target.value)}
              className="mt-1 w-full max-w-xs rounded-md border border-slate-300 px-3 py-2"
            >
              <option value="available">Available</option>
              <option value="busy">Busy</option>
              <option value="away">Away</option>
              <option value="offline">Offline</option>
            </select>
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={locationSharing} onChange={(e) => setLocationSharing(e.target.checked)} />
            Share my live location while on duty (location_sharing consent)
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={publicVis} onChange={(e) => setPublicVis(e.target.checked)} />
            Show my approximate location on the public map (public_map_visibility)
          </label>
          <Button onClick={() => void save()}>Save settings</Button>
        </CardBody>
      </Card>
    </div>
  );
}
