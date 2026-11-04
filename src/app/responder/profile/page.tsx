"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardBody } from "@/components/ui/card";

export default function ResponderProfilePage() {
  const [name, setName] = useState("");
  const [bio, setBio] = useState("");
  const [area, setArea] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<string | null>(null);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await fetch("/api/v1/responders/me", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ displayName: name, bio, operatingArea: area }),
      });
      setDone(res.ok ? "Profile updated." : "Could not update profile.");
    } catch {
      setDone("Network error.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Profile</h1>
      <Card>
        <CardHeader title="Public profile" description="Only opt-in fields appear on the public map; contact details stay private." />
        <CardBody>
          <form onSubmit={submit} className="space-y-4">
            {done && <p className="text-sm text-emerald-800">{done}</p>}
            <div>
              <label className="mb-1 block text-sm font-semibold" htmlFor="name">Display name</label>
              <input id="name" value={name} onChange={(e) => setName(e.target.value)} className="w-full rounded-md border border-slate-300 px-3 py-2" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-semibold" htmlFor="bio">Short bio (public)</label>
              <textarea id="bio" rows={3} value={bio} onChange={(e) => setBio(e.target.value)} className="w-full rounded-md border border-slate-300 px-3 py-2" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-semibold" htmlFor="area">Operating area</label>
              <input id="area" value={area} onChange={(e) => setArea(e.target.value)} className="w-full rounded-md border border-slate-300 px-3 py-2" />
            </div>
            <Button type="submit" disabled={busy}>{busy ? "Saving…" : "Save profile"}</Button>
          </form>
        </CardBody>
      </Card>
    </div>
  );
}
