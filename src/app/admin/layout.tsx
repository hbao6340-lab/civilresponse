import Link from "next/link";
import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { getSessionUser, isAdmin, canVerify } from "@/lib/auth";

const links = [
  { href: "/admin/dashboard", label: "Dashboard" },
  { href: "/admin/map", label: "Map" },
  { href: "/admin/responders", label: "Responders" },
  { href: "/admin/incidents", label: "Incidents" },
  { href: "/admin/users", label: "Users" },
  { href: "/admin/reports", label: "Reports & exports" },
  { href: "/admin/settings", label: "Settings" },
];

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (!isAdmin(user) && !canVerify(user)) redirect("/");

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-8 md:flex-row">
      <aside className="md:w-56 md:shrink-0">
        <nav aria-label="Administration" className="space-y-1 rounded-xl border border-slate-200 bg-white p-3">
          <p className="px-2 pb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
            Administration
          </p>
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="block rounded-md px-2 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 hover:text-[#0b2545]"
            >
              {l.label}
            </Link>
          ))}
        </nav>
      </aside>
      <section className="flex-1">{children}</section>
    </div>
  );
}
