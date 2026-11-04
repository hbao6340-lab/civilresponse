"use client";

import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface Row {
  id: string;
  displayName: string;
  email?: string;
  verificationStatus: string;
  availabilityStatus: string;
  dutyMode: boolean;
}

export default function AdminRespondersPage() {
  const { data, isLoading, refetch } = useQuery({
    queryKey: ["admin-responders"],
    queryFn: async (): Promise<Row[]> => {
      const res = await fetch("/api/v1/admin/responders");
      const json = (await res.json()) as { data: { responders: Row[] } };
      return json.data.responders;
    },
  });

  const decide = async (id: string, decision: "verified" | "rejected" | "suspended") => {
    await fetch(`/api/v1/admin/responders/${id}/verify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ decision }),
    });
    void refetch();
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Responders & verification</h1>
      <Card>
        <CardHeader title="Verification queue" description="Approve, reject, or suspend. Every decision is audit-logged." />
        <CardBody>
          {isLoading && <p className="text-sm text-slate-500">Loading…</p>}
          {data?.length === 0 && <p className="text-sm text-slate-500">No responders yet.</p>}
          <ul className="space-y-3">
            {data?.map((r) => (
              <li key={r.id} className="rounded-md border border-slate-200 p-4 text-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-semibold">{r.displayName}</span>
                  <span className="flex gap-2">
                    <Badge tone={r.verificationStatus === "verified" ? "green" : r.verificationStatus === "suspended" ? "red" : "orange"}>
                      {r.verificationStatus}
                    </Badge>
                    <Badge tone={r.dutyMode ? "blue" : "grey"}>
                      {r.dutyMode ? "on duty" : "off duty"}
                    </Badge>
                  </span>
                </div>
                <p className="mt-1 text-slate-500">Availability: {r.availabilityStatus}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button onClick={() => void decide(r.id, "verified")}>Verify</Button>
                  <Button variant="secondary" onClick={() => void decide(r.id, "rejected")}>Reject</Button>
                  <Button variant="danger" onClick={() => void decide(r.id, "suspended")}>Suspend</Button>
                </div>
              </li>
            ))}
          </ul>
        </CardBody>
      </Card>
    </div>
  );
}
