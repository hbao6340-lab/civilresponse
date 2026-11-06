"use client";

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardHeader, CardBody } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface MeInfo {
  primaryRole?: string;
  primaryLabel?: string;
  isPrivileged?: boolean;
}

export default function AdminDashboardPage() {
  const [me, setMe] = useState<MeInfo | null>(null);

  useEffect(() => {
    fetch("/api/v1/auth/me")
      .then((r) => r.json() as Promise<{ success: boolean; data?: MeInfo }>)
      .then((json) => {
        if (json.success && json.data) setMe(json.data);
      })
      .catch(() => setMe(null));
  }, []);

  const { data, isLoading, error } = useQuery({
    queryKey: ["admin-summary"],
    queryFn: async () => {
      const res = await fetch("/api/v1/admin/summary");
      const json = (await res.json()) as {
        success: boolean;
        data?: Record<string, number>;
        error?: { message: string };
      };
      if (res.status === 403) {
        throw new Error("Insufficient permissions — your role does not include the operations summary.");
      }
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message ?? "Could not load summary.");
      }
      return { data: json.data ?? {} as Record<string, number> };
    },
  });

  const stats: [string, string][] = [
    ["Registered responders", "registeredResponders"],
    ["Verified responders", "verifiedResponders"],
    ["On duty now", "onDuty"],
    ["Available", "available"],
    ["Responding", "responding"],
    ["Active incidents", "activeIncidents"],
    ["Unassigned incidents", "unassignedIncidents"],
    ["Resolved today", "resolvedToday"],
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Operations dashboard</h1>
        {me?.primaryLabel && <Badge tone="navy">{me.primaryLabel} · control center</Badge>}
      </div>
      <p className="text-sm text-slate-600">
        {me?.primaryRole === "verification_officer"
          ? "Your queue: responder verification. Incident moderation, exports, and role changes need an administrator."
          : me?.primaryRole === "administrator"
            ? "Responders, incidents, users (view), and exports are available. Role changes and global settings need a super admin."
            : me?.primaryRole === "super_admin"
              ? "Full control: verification, incidents, roles, exports, and global settings."
              : "Role-specific tools appear here after sign-in."}
      </p>

      {error && (
        <p role="alert" className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          {(error as Error).message}
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map(([label, key]) => (
          <Card key={key}>
            <CardBody>
              <p className="text-2xl font-bold text-[#0b2545]">
                {isLoading ? "…" : (data?.data[key] ?? "—")}
              </p>
              <p className="text-sm text-slate-600">{label}</p>
            </CardBody>
          </Card>
        ))}
      </div>
      <Card>
        <CardHeader title="Verification queue" description="Pending responder applications awaiting review." />
        <CardBody>
          <p className="text-sm text-slate-600">
            {data?.data.pendingVerification != null
              ? `${data.data.pendingVerification} applications pending.`
              : "Live counts appear here once Supabase is configured."}{" "}
            Open Responders to review.
          </p>
        </CardBody>
      </Card>
    </div>
  );
}
