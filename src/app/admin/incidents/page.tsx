"use client";

import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardBody } from "@/components/ui/card";
import { formatTimestamp } from "@/lib/utils";

export default function AdminIncidentsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["admin-incidents"],
    queryFn: async () => {
      const res = await fetch("/api/v1/admin/incidents");
      const json = (await res.json()) as {
        data: {
          incidents: {
            id: string;
            publicReference: string;
            category: string;
            status: string;
            priority: string;
            createdAt: string;
          }[];
        };
      };
      return json.data.incidents;
    },
  });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Incidents</h1>
      <Card>
        <CardHeader title="Incident management" description="Lifecycle: NEW → PENDING_REVIEW → VERIFIED → NOTIFYING → ACCEPTED → EN_ROUTE → ON_SCENE → RESOLVED / CANCELLED / FALSE_REPORT." />
        <CardBody>
          {isLoading && <p className="text-sm text-slate-500">Loading…</p>}
          {data?.length === 0 && <p className="text-sm text-slate-500">No incidents recorded.</p>}
          <ul className="space-y-2">
            {data?.map((i) => (
              <li key={i.id} className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-slate-200 p-3 text-sm">
                <span>
                  <span className="font-mono">{i.publicReference}</span>{" "}
                  <span className="text-slate-600">{i.category.replaceAll("_", " ")}</span>
                </span>
                <span className="flex items-center gap-2">
                  <Badge tone="navy">{i.status.replaceAll("_", " ")}</Badge>
                  <span className="text-slate-500">{formatTimestamp(i.createdAt)}</span>
                </span>
              </li>
            ))}
          </ul>
        </CardBody>
      </Card>
    </div>
  );
}
