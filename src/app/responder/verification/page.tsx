"use client";

import { useEffect, useState } from "react";
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

interface MeInfo {
  isPrivileged?: boolean;
  primaryLabel?: string;
  responder?: { verificationStatus?: string | null } | null;
}

export default function ResponderVerificationPage() {
  const [status, setStatus] = useState<string>("pending");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<string | null>(null);
  const [me, setMe] = useState<MeInfo | null>(null);

  useEffect(() => {
    fetch("/api/v1/auth/me")
      .then((r) => r.json() as Promise<{ success: boolean; data?: MeInfo }>)
      .then((json) => {
        if (json.success && json.data) {
          setMe(json.data);
          const s = json.data.responder?.verificationStatus;
          if (typeof s === "string" && s) setStatus(s);
        }
      })
      .catch(() => setMe(null));
  }, []);

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

      {me?.isPrivileged && (
        <Card className="border-blue-200">
          <CardHeader
            title="Staff access — verification bypassed"
            description="Verification officer / administrator / super admin accounts use the control center and do not need to upload responder documents."
          />
          <CardBody>
            <p className="text-sm text-slate-600">
              {me.primaryLabel ?? "Staff"} role is active. Open the{" "}
              <a className="underline" href="/admin/dashboard">
                control center
              </a>{" "}
              for the verification queue and role-appropriate tools. Responder
              duty mode and GPS still require a verified responder profile.
            </p>
          </CardBody>
        </Card>
      )}

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
                <Button variant="secondary" disabled={busy || Boolean(me?.isPrivileged)} onClick={() => void upload(d)}>
                  Upload
                </Button>
              </li>
            ))}
          </ul>
          <p className="mt-4 text-sm text-slate-600">
            {me?.isPrivileged
              ? "Document upload is disabled for staff accounts (verification bypass). Use the control center instead."
              : "File uploads use private, signed URLs. Accepted formats and size limits are enforced server-side. Full upload flow ships in Phase 2."}
          </p>
        </CardBody>
      </Card>
    </div>
  );
}
