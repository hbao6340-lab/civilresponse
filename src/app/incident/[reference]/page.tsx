"use client";

import { use, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardBody } from "@/components/ui/card";
import type { IncidentRecord } from "@/lib/types";
import { formatTimestamp } from "@/lib/utils";
import { INCIDENT_CATEGORY_LABEL } from "@/lib/constants";

/**
 * Secure incident tracking page.
 * Requires BOTH the public reference and the secret tracking token.
 */
export default function IncidentTrackPage({
  params,
}: {
  params: Promise<{ reference: string }>;
}) {
  const { reference } = use(params);
  const [manual, setManual] = useState("");
  const [urlToken] = useState<string | null>(() =>
    typeof window === "undefined"
      ? null
      : new URLSearchParams(window.location.search).get("t"),
  );

  // No token in the URL: the manual entry is authoritative and effect-free.
  const hasUrlToken = urlToken !== null;
  const token = hasUrlToken ? urlToken : null;

  const query = useQuery({
    queryKey: ["incident", reference, token],
    enabled: token !== null,
    queryFn: async (): Promise<IncidentRecord> => {
      const res = await fetch(
        `/api/v1/incidents/${encodeURIComponent(reference)}?t=${encodeURIComponent(token ?? "")}`,
      );
      const json = (await res.json()) as {
        success: boolean;
        data?: IncidentRecord;
        error?: { message: string };
      };
      if (!res.ok || !json.success || !json.data) {
        throw new Error(json.error?.message ?? "Invalid tracking link.");
      }
      return json.data;
    },
  });

  const incident = query.data ?? null;
  const error = query.isError
    ? query.error instanceof Error
      ? query.error.message
      : "Invalid tracking link."
    : null;
  const loading = token !== null && query.isPending;

  if (!token) {
    return (
      <div className="mx-auto max-w-xl px-4 py-14">
        <h1 className="text-2xl font-bold">Track incident {reference}</h1>
        <p className="mt-2 text-sm text-slate-600">
          Tracking requires the secret token issued when you submitted the
          report. Paste it below.
        </p>
        <form
          className="mt-4 space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            const tok = manual.trim();
            if (tok) {
              window.location.search = `?t=${encodeURIComponent(tok)}`;
            }
          }}
        >
          <label className="block text-sm font-semibold" htmlFor="token">
            Tracking token
          </label>
          <input
            id="token"
            value={manual}
            onChange={(e) => setManual(e.target.value)}
            className="w-full rounded-md border border-slate-300 px-3 py-2"
            placeholder="Token from your confirmation"
          />
          <button
            type="submit"
            className="rounded-md bg-[#0b2545] px-4 py-2 text-sm font-semibold text-white"
          >
            Open tracker
          </button>
        </form>
        {error && <p className="mt-3 text-sm text-red-700">{error}</p>}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="text-2xl font-bold">Incident {reference}</h1>
      {loading && <p className="mt-4 text-slate-500">Loading…</p>}
      {error && (
        <p role="alert" className="mt-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          {error}
        </p>
      )}
      {incident && (
        <Card className="mt-4">
          <CardHeader
            title={INCIDENT_CATEGORY_LABEL[incident.category]}
            description={`Reported ${formatTimestamp(incident.createdAt)} · updated ${formatTimestamp(incident.updatedAt)}`}
            action={<Badge tone="navy">{incident.status.replaceAll("_", " ")}</Badge>}
          />
          <CardBody>
            <dl className="grid gap-3 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-slate-500">Reference</dt>
                <dd className="font-mono">{incident.publicReference}</dd>
              </div>
              <div>
                <dt className="text-slate-500">Priority</dt>
                <dd className="capitalize">{incident.priority}</dd>
              </div>
              <div>
                <dt className="text-slate-500">Location</dt>
                <dd>{incident.address ?? "Exact location held privately"}</dd>
              </div>
              <div>
                <dt className="text-slate-500">People affected</dt>
                <dd>{incident.affectedPersons ?? "Unknown"}</dd>
              </div>
            </dl>
            <p className="mt-4 rounded-md bg-slate-50 p-3 text-sm text-slate-700">
              Status updates appear here in real time as responders accept and
              respond. If the situation worsens, call 113 / 114 / 115
              immediately. Keep this token private — anyone with it can view
              this incident.
            </p>
          </CardBody>
        </Card>
      )}
    </div>
  );
}
