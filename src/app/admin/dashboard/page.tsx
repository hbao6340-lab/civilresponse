"use client";

import { useQuery } from "@tanstack/react-query";
import { Card, CardHeader, CardBody } from "@/components/ui/card";

export default function AdminDashboardPage() {
  const { data } = useQuery({
    queryKey: ["admin-summary"],
    queryFn: async () => {
      const res = await fetch("/api/v1/admin/summary");
      if (!res.ok) return null;
      return (await res.json()) as {
        data: Record<string, number>;
      };
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
      <h1 className="text-2xl font-bold">Operations dashboard</h1>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map(([label, key]) => (
          <Card key={key}>
            <CardBody>
              <p className="text-2xl font-bold text-[#0b2545]">
                {data?.data[key] ?? "—"}
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
