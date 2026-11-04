"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardBody } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function BecomeResponderPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [area, setArea] = useState("");
  const [quals, setQuals] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/v1/responders/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ displayName: name, email, phone, operatingArea: area, qualifications: quals }),
      });
      const json = (await res.json()) as {
        success: boolean;
        data?: { message: string };
        error?: { message: string };
      };
      if (!res.ok || !json.success) {
        setError(json.error?.message ?? "Could not submit your application.");
        setBusy(false);
        return;
      }
      setDone(json.data?.message ?? "Application submitted.");
    } catch {
      setError("Network error. Please try again.");
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="text-3xl font-bold text-slate-900">Become a responder</h1>
      <p className="mt-2 text-slate-600">
        Join the Ho Chi Minh City community responder network. Verification is required
        before you can go on duty. You are volunteers — never official police,
        firefighters, or paramedics.
      </p>
      <Badge tone="navy" className="mt-3">
        Verification required · Consent-based GPS · Duty-gated
      </Badge>

      {done ? (
        <Card className="mt-6">
          <CardBody>
            <p className="text-emerald-800">{done}</p>
            <p className="mt-2 text-sm text-slate-600">
              Check your email to confirm your account, then upload identity
              and qualification documents from your responder dashboard.
            </p>
          </CardBody>
        </Card>
      ) : (
        <Card className="mt-6">
          <CardHeader
            title="Responder application"
            description="You will receive an email to create your account. Verification officers review every application."
          />
          <CardBody>
            <form onSubmit={submit} className="space-y-4">
              {error && (
                <p role="alert" className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">
                  {error}
                </p>
              )}
              <div>
                <label className="mb-1 block text-sm font-semibold" htmlFor="name">Full name / display name</label>
                <input id="name" required value={name} onChange={(e) => setName(e.target.value)} className="w-full rounded-md border border-slate-300 px-3 py-2" />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-semibold" htmlFor="email">Email</label>
                  <input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="w-full rounded-md border border-slate-300 px-3 py-2" />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-semibold" htmlFor="phone">Phone</label>
                  <input id="phone" required value={phone} onChange={(e) => setPhone(e.target.value)} className="w-full rounded-md border border-slate-300 px-3 py-2" />
                </div>
              </div>
              <div>
                <label className="mb-1 block text-sm font-semibold" htmlFor="area">Operating area in Ho Chi Minh City</label>
                <input id="area" required value={area} onChange={(e) => setArea(e.target.value)} placeholder="e.g. District 1, Thủ Đức, Quận 7" className="w-full rounded-md border border-slate-300 px-3 py-2" />
              </div>
              <div>
                <label className="mb-1 block text-sm font-semibold" htmlFor="quals">Relevant qualifications (optional)</label>
                <textarea id="quals" rows={3} value={quals} onChange={(e) => setQuals(e.target.value)} placeholder="First aid, traffic safety, water rescue, etc." className="w-full rounded-md border border-slate-300 px-3 py-2" />
              </div>
              <Button type="submit" disabled={busy}>
                {busy ? "Submitting…" : "Submit application"}
              </Button>
            </form>
          </CardBody>
        </Card>
      )}
    </div>
  );
}
