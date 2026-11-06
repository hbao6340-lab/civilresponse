"use client";

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface UserRow {
  id: string;
  email: string;
  roles: string[];
  createdAt: string;
}

const ALL_ROLES = [
  "citizen",
  "responder",
  "verification_officer",
  "administrator",
  "super_admin",
] as const;

interface MeResponse {
  success: boolean;
  data?: {
    capabilities?: { canManageRoles?: boolean };
    primaryRole?: string;
  };
}

export default function AdminUsersPage() {
  const [me, setMe] = useState<MeResponse | null>(null);
  const [drafts, setDrafts] = useState<Record<string, string[]>>({});
  const [saving, setSaving] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/v1/auth/me")
      .then((r) => r.json() as Promise<MeResponse>)
      .then(setMe)
      .catch(() => setMe(null));
  }, []);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["admin-users"],
    queryFn: async (): Promise<UserRow[]> => {
      const res = await fetch("/api/v1/admin/users");
      const json = (await res.json()) as {
        success: boolean;
        data?: { users: UserRow[] };
        error?: { message: string };
      };
      if (res.status === 403) {
        throw new Error("Insufficient permissions — your role does not include account viewing. Verification officers review responder applications only.");
      }
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message ?? "Could not load users.");
      }
      return json.data?.users ?? [];
    },
  });

  // Role drafts fall back to server roles until edited (no effect seeding).

  const canManage = me?.data?.capabilities?.canManageRoles === true;

  const toggleDraft = (userId: string, role: string) => {
    const baseRoles = data?.find((u) => u.id === userId)?.roles ?? [];
    setDrafts((prev) => {
      const current = prev[userId] ?? baseRoles;
      const has = current.includes(role);
      return {
        ...prev,
        [userId]: has ? current.filter((r) => r !== role) : [...current, role],
      };
    });
  };

  const save = async (user: UserRow) => {
    const roles = drafts[user.id] ?? user.roles;
    setSaving(user.id);
    setDone(null);
    try {
      const res = await fetch(`/api/v1/admin/users/${user.id}/roles`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roles }),
      });
      const json = (await res.json()) as {
        success: boolean;
        error?: { message: string };
      };
      if (!res.ok || !json.success) {
        setDone(json.error?.message ?? "Could not save roles.");
        return;
      }
      setDone(`Roles updated for ${user.email}.`);
      void refetch();
    } catch {
      setDone("Network error. Roles were not changed.");
    } finally {
      setSaving(null);
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Users & roles</h1>
      <Card>
        <CardHeader
          title="Accounts"
          description={
            canManage
              ? "Super admin: grant or revoke roles below. Every change is audit-logged, and you cannot remove your own or the last super_admin role."
              : "Roles are enforced server-side via user_roles. Only super admins can change roles — administrators have view-only access here."
          }
        />
        <CardBody>
          {done && <p className="mb-3 text-sm text-emerald-800">{done}</p>}
          {isLoading && <p className="text-sm text-slate-500">Loading…</p>}
          {error && (
            <p role="alert" className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">
              {(error as Error).message}
            </p>
          )}
          {data?.length === 0 && <p className="text-sm text-slate-500">No users yet.</p>}
          <ul className="space-y-3">
            {data?.map((u) => {
              const draft = drafts[u.id] ?? u.roles;
              const dirty = JSON.stringify([...draft].sort()) !== JSON.stringify([...u.roles].sort());
              return (
                <li key={u.id} className="rounded-md border border-slate-200 p-4 text-sm">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-mono">{u.email}</span>
                    <span className="flex flex-wrap gap-1">
                      {u.roles.length === 0 && <Badge tone="neutral">no roles</Badge>}
                      {u.roles.map((r) => (
                        <Badge key={r} tone={r === "super_admin" ? "navy" : "neutral"}>
                          {r}
                        </Badge>
                      ))}
                    </span>
                  </div>
                  {canManage ? (
                    <div className="mt-3 space-y-3">
                      <div className="flex flex-wrap gap-3">
                        {ALL_ROLES.map((role) => (
                          <label key={role} className="flex items-center gap-1.5 text-xs">
                            <input
                              type="checkbox"
                              checked={draft.includes(role)}
                              onChange={() => toggleDraft(u.id, role)}
                            />
                            {role}
                          </label>
                        ))}
                      </div>
                      <Button
                        variant="secondary"
                        disabled={saving === u.id || !dirty}
                        onClick={() => void save(u)}
                      >
                        {saving === u.id ? "Saving…" : "Save roles"}
                      </Button>
                    </div>
                  ) : (
                    <p className="mt-2 text-xs text-slate-500">
                      View-only — role changes require super_admin.
                    </p>
                  )}
                </li>
              );
            })}
          </ul>
        </CardBody>
      </Card>
    </div>
  );
}
