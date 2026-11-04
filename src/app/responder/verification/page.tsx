"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const docTypes = [
  "National ID / CCCD",
  "First aid certificate",
  "Traffic safety certificate",
  "Water rescue certificate",
  "Other qualification",
];

export default function ResponderVerificationPage() {
  const [status, setStatus] = useState<string>("pending");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<string | null>(null);

  const upload = async (doc: string) => {
    setBusy(true);
    try {
      const res = await fetch("/api/v1/responders/documents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ documentType: doc, note: "Uploaded via dashboard" }),
      });
      setDone(res.ok ? `Recorded ${doc}. Awaiting officer review.` : "Upload failed.");
      if (res.ok) setStatus("pending");
    } catch {
      setDone("Network error.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Verification</h1>
        <Badge tone={status === "verified" ? "green" : "orange"}>{status}</Badge>
      </div>
      <Card>
        <CardHeader
          title="Identity & qualifications"
          description="Documents go to private storage. Only verification officers and administrators can view them. You cannot go on duty until verified."
        />
        <CardBody>
          {done && <p className="mb-3 text-sm text-emerald-800">{done}</p>}
          <ul className="space-y-2">
            {docTypes.map((d) => (
              <li key={d} className="flex items-center justify-between rounded-md border border-slate-200 p-3 text-sm">
                <span>{d}</span>
                <Button variant="secondary" disabled={busy} onClick={() => void upload(d)}>
                  Upload
                </Button>
              </li>
            ))}
          </ul>
          <p className="mt-4 text-sm text-slate-600">
            File uploads use private, signed URLs. Accepted formats and size
            limits are enforced server-side. Full upload flow ships in Phase 2.
          </p>
        </CardBody>
      </Card>
    </div>
  );
}
