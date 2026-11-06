"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatTimestamp } from "@/lib/utils";

const INCIDENT_STATUSES = [
  "NEW",
  "PENDING_REVIEW",
  "VERIFIED",
  "NOTIFYING",
  "ACCEPTED",
  "EN_ROUTE",
  "ON_SCENE",
  "RESOLVED",
  "CANCELLED",
  "FALSE_REPORT",
] as const;

interface IncidentRow {
  id: string;
  publicReference: string;
  category: string;
  status: string;
  priority: string;
  createdAt: string;
}

export default function AdminIncidentsPage() {
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["admin-incidents"],
    queryFn: async (): Promise<IncidentRow[]> => {
      const res = await fetch("/api/v1/admin/incidents");
      const json = (await res.json()) as {
        success: boolean;
        data?: { incidents: IncidentRow[] };
        error?: { message: string };
      };
      if (res.status === 403) {
        throw new Error("Insufficient permissions — incident moderation requires an administrator role.");
      }
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message ?? "Could not load incidents.");
      }
      return json.data?.incidents ?? [];
    },
  });

  const updateStatus = async (incident: IncidentRow) => {
    const status = drafts[incident.id] ?? incident.status;
    if (status === incident.status) return;
    setSaving(incident.id);
    setDone(null);
    try {
      const res = await fetch(`/api/v1/admin/incidents/${incident.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const json = (await res.json()) as {
        success: boolean;
        error?: { message: string };
      };
      if (!res.ok || !json.success) {
        setDone(json.error?.message ?? "Could not update incident.");
        return;
      }
      setDone(`Incident ${incident.publicReference} set to ${status.replaceAll("_", " ")}.`);
      void refetch();
    } catch {
      setDone("Network error. Incident was not updated.");
    } finally {
      setSaving(null);
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Incidents</h1>
      <Card>
        <CardHeader
          title="Incident management"
          description="Lifecycle: NEW → PENDING_REVIEW → VERIFIED → NOTIFYING → ACCEPTED → EN_ROUTE → ON_SCENE → RESOLVED / CANCELLED / FALSE_REPORT. Every change is recorded as an incident event."
        />
        <CardBody>
          {done && <p className="mb-3 text-sm text-emerald-800">{done}</p>}
          {isLoading && <p className="text-sm text-slate-500">Loading…</p>}
          {error && (
            <p role="alert" className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">
              {(error as Error).message}
            </p>
          )}
          {data?.length === 0 && <p className="text-sm text-slate-500">No incidents recorded.</p>}
          <ul className="space-y-3">
            {data?.map((i) => {
              const draft = drafts[i.id] ?? i.status;
              const dirty = draft !== i.status;
              return (
                <li key={i.id} className="rounded-md border border-slate-200 p-3 text-sm">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span>
                      <span className="font-mono">{i.publicReference}</span>{" "}
                      <span className="text-slate-600">{i.category.replaceAll("_", " ")}</span>
                    </span>
                    <span className="flex items-center gap-2">
                      <Badge tone="navy">{i.status.replaceAll("_", " ")}</Badge>
                      <span className="text-slate-500">{formatTimestamp(i.createdAt)}</span>
                    </span>
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <label className="flex items-center gap-2 text-xs font-semibold text-slate-600">
                      Set status
                      <select
                        value={draft}
                        onChange={(e) =>
                          setDrafts((prev) => ({ ...prev, [i.id]: e.target.value }))
                        }
                        className="rounded-md border border-slate-300 px-2 py-1 text-sm font-normal"
                      >
                        {INCIDENT_STATUSES.map((s) => (
                          <option key={s} value={s}>
                            {s.replaceAll("_", " ")}
                          </option>
                        ))}
                      </select>
                    </label>
                    <Button
                      variant="secondary"
                      disabled={saving === i.id || !dirty}
                      onClick={() => void updateStatus(i)}
                    >
                      {saving === i.id ? "Saving…" : "Apply"}
                    </Button>
                  </div>
                </li>
              );
            })}
          </ul>
        </CardBody>
      </Card>
    </div>
  );
}
