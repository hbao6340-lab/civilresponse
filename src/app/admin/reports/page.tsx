"use client";

import { useState } from "react";
import { Card, CardHeader, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function AdminReportsPage() {
  const [done, setDone] = useState<string | null>(null);

  const download = async (kind: string) => {
    const res = await fetch(`/api/v1/admin/exports/${kind}`);
    if (res.status === 403) {
      setDone("Insufficient permissions — CSV exports require an administrator role.");
      return;
    }
    if (!res.ok) {
      setDone("Export unavailable (requires a configured backend).");
      return;
    }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${kind}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    setDone(`${kind} export downloaded.`);
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Reports & exports</h1>
      <Card>
        <CardHeader title="CSV exports" description="Aggregated operational data only — no raw identity documents or precise GPS are ever exported. Administrator + super_admin only." />
        <CardBody className="space-y-3">
          {done && <p className="text-sm text-emerald-800">{done}</p>}
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" onClick={() => void download("incidents")}>Incidents CSV</Button>
            <Button variant="secondary" onClick={() => void download("responders")}>Responders CSV</Button>
            <Button variant="secondary" onClick={() => void download("assignments")}>Assignments CSV</Button>
            <Button variant="secondary" onClick={() => void download("audit")}>Audit log CSV</Button>
          </div>
          <p className="text-sm text-slate-600">
            Audit-log viewing ships with the Phase 6 analytics surface. All
            exports require administrator role and are themselves audit-logged.
            Verification officers cannot access this page.
          </p>
        </CardBody>
      </Card>
    </div>
  );
}
