"use client";

import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatTimestamp } from "@/lib/utils";

export default function ResponderIncidentsPage() {
  const { data, isLoading, error, dataUpdatedAt, isFetching, refetch } = useQuery({
    queryKey: ["responder-incidents"],
    queryFn: async () => {
      const res = await fetch("/api/v1/assignments/mine");
      const json = (await res.json()) as {
        success: boolean;
        data?: {
          assignments: {
            id: string;
            incidentId: string;
            publicReference: string;
            category: string;
            status: string;
            assignmentStatus: string;
            assignedAt: string;
          }[];
        };
        error?: { message: string };
      };
      if (!res.ok || !json.success) throw new Error(json.error?.message ?? "Failed");
      return json.data?.assignments ?? [];
    },
    refetchInterval: 10_000,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true,
  });

  const act = async (id: string, action: "accept" | "decline") => {
    await fetch(`/api/v1/assignments/${id}/${action}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    void refetch();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-bold">My incidents</h1>
        <p className="text-xs text-slate-500">
          {isFetching ? "Updating…" : "Live · updates every 10s"}
          {dataUpdatedAt
            ? ` · ${new Date(dataUpdatedAt).toLocaleTimeString()}`
            : ""}
        </p>
      </div>
      <Card>
        <CardHeader title="Assigned & nearby incidents" description="Accept or decline promptly. Never accept beyond your training. Refreshes live as incidents are dealt with." />
        <CardBody>
          {isLoading && <p className="text-sm text-slate-500">Loading…</p>}
          {error && <p className="text-sm text-red-700">{(error as Error).message}</p>}
          {data && data.length === 0 && (
            <p className="text-sm text-slate-500">
              No active assignments. When you are on duty, nearby incidents
              will appear here.
            </p>
          )}
          <ul className="space-y-3">
            {data?.map((a) => (
              <li key={a.id} className="rounded-md border border-slate-200 p-4 text-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-mono">{a.publicReference}</span>
                  <span className="flex gap-2">
                    <Badge tone="neutral">{a.category.replaceAll("_", " ")}</Badge>
                    <Badge tone="navy">{a.status.replaceAll("_", " ")}</Badge>
                  </span>
                </div>
                <p className="mt-1 text-slate-500">Assigned {formatTimestamp(a.assignedAt)}</p>
                {a.assignmentStatus === "pending" && (
                  <div className="mt-3 flex gap-2">
                    <Button onClick={() => void act(a.id, "accept")}>Accept</Button>
                    <Button variant="secondary" onClick={() => void act(a.id, "decline")}>Decline</Button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        </CardBody>
      </Card>
    </div>
  );
}
