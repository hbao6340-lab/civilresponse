"use client";

import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardBody } from "@/components/ui/card";

export default function AdminUsersPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["admin-users"],
    queryFn: async () => {
      const res = await fetch("/api/v1/admin/users");
      const json = (await res.json()) as {
        data: { users: { id: string; email: string; roles: string[]; createdAt: string }[] };
      };
      return json.data.users;
    },
  });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Users & roles</h1>
      <Card>
        <CardHeader title="Accounts" description="Roles are enforced server-side via user_roles. Personal data is restricted by permission; contact details are never shown here without authorisation." />
        <CardBody>
          {isLoading && <p className="text-sm text-slate-500">Loading…</p>}
          {data?.length === 0 && <p className="text-sm text-slate-500">No users yet.</p>}
          <ul className="space-y-2">
            {data?.map((u) => (
              <li key={u.id} className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-slate-200 p-3 text-sm">
                <span className="font-mono">{u.email}</span>
                <span className="flex gap-1">
                  {u.roles.map((r) => (
                    <Badge key={r} tone="neutral">{r}</Badge>
                  ))}
                </span>
              </li>
            ))}
          </ul>
        </CardBody>
      </Card>
    </div>
  );
}
