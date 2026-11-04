import Link from "next/link";
import type { ReactNode } from "react";
import { isResponder } from "@/lib/auth";
import { getSessionUser } from "@/lib/auth";
import { redirect } from "next/navigation";

const links = [
  { href: "/responder/dashboard", label: "Dashboard" },
  { href: "/responder/profile", label: "Profile" },
  { href: "/responder/verification", label: "Verification" },
  { href: "/responder/incidents", label: "Incidents" },
  { href: "/responder/settings", label: "Settings" },
];

export default async function ResponderLayout({
  children,
}: {
  children: ReactNode;
}) {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (!isResponder(user)) redirect("/responder/verification");

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-8 md:flex-row">
      <aside className="md:w-56 md:shrink-0">
        <nav aria-label="Responder" className="space-y-1 rounded-xl border border-slate-200 bg-white p-3">
          <p className="px-2 pb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
            Responder
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
