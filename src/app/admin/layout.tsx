import Link from "next/link";
import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import {
  canExport,
  canManageIncidents,
  canManageSettings,
  canManageRoles,
  canVerify,
  canViewUsers,
  getPrimaryRole,
  isAdmin,
  isResponder,
  roleLabel,
} from "@/lib/auth";
import { getSessionUser } from "@/lib/auth";
import { Badge } from "@/components/ui/badge";

function adminLinksFor(user: Awaited<ReturnType<typeof getSessionUser>>) {
  const all = [
    { href: "/admin/dashboard", label: "Dashboard", visible: true },
    {
      href: "/admin/map",
      label: "Map",
      // Operations map is the public privacy-protected feed; staff may view it.
      visible: canVerify(user) || isAdmin(user),
    },
    {
      href: "/admin/responders",
      label: "Responders",
      // Verification queue: verification_officer + administrators.
      visible: canVerify(user),
    },
    {
      href: "/admin/incidents",
      label: "Incidents",
      // Incident moderation: administrator + super_admin only.
      visible: canManageIncidents(user),
    },
    {
      href: "/admin/users",
      label: "Users",
      // Account listing: administrator + super_admin only.
      visible: canViewUsers(user),
    },
    {
      href: "/admin/reports",
      label: "Reports & exports",
      // CSV exports: administrator + super_admin only.
      visible: canExport(user),
    },
    {
      href: "/admin/settings",
      label: "Settings",
      // Global config: super_admin only.
      visible: canManageSettings(user),
    },
  ];
  return all.filter((l) => l.visible).map(({ href, label }) => ({ href, label }));
}

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (!isAdmin(user) && !canVerify(user)) redirect("/dashboard");

  const links = adminLinksFor(user);
  const primaryRole = getPrimaryRole(user);

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-8 md:flex-row">
      <aside className="md:w-56 md:shrink-0">
        <nav aria-label="Administration" className="space-y-1 rounded-xl border border-slate-200 bg-white p-3">
          <p className="px-2 pb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
            Administration
          </p>
          <p className="px-2 pb-2">
            <Badge tone="navy">{roleLabel(primaryRole)}</Badge>
          </p>
          {primaryRole === "verification_officer" && (
            <p className="rounded-md bg-blue-50 px-2 py-2 text-xs leading-relaxed text-slate-700">
              Verification queue only — approve, reject, or suspend responder
              applications. Incident moderation, exports, and role changes need
              an administrator.
            </p>
          )}
          {primaryRole === "administrator" && (
            <p className="rounded-md bg-blue-50 px-2 py-2 text-xs leading-relaxed text-slate-700">
              Responders, incidents, users (view), and exports. Role changes and
              global settings need a super admin.
            </p>
          )}
          {primaryRole === "super_admin" && (
            <p className="rounded-md bg-blue-50 px-2 py-2 text-xs leading-relaxed text-slate-700">
              Full control — including role management and global settings.
            </p>
          )}
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="block rounded-md px-2 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 hover:text-[#0b2545]"
            >
              {l.label}
            </Link>
          ))}
          {isResponder(user) && (
            <Link
              href="/responder/dashboard"
              className="block rounded-md px-2 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 hover:text-[#0b2545]"
            >
              Responder view
            </Link>
          )}
          {canManageRoles(user) && (
            <p className="px-2 pt-2 text-[11px] leading-relaxed text-slate-500">
              Users → manage roles is super-admin only.
            </p>
          )}
        </nav>
      </aside>
      <section className="flex-1">{children}</section>
    </div>
  );
}
