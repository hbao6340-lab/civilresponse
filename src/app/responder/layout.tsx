import Link from "next/link";
import type { ReactNode } from "react";
import {
  getPrimaryRole,
  getResponderVerificationStatus,
  isPrivileged,
  isResponder,
  roleLabel,
} from "@/lib/auth";
import { getSessionUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Badge } from "@/components/ui/badge";

function responderLinks(opts: {
  privileged: boolean;
  verified: boolean;
  hasResponderRole: boolean;
}) {
  const base = [
    { href: "/responder/dashboard", label: "Dashboard" },
    { href: "/responder/profile", label: "Profile" },
    // Staff bypass the verification phase: no document upload needed.
    ...(!opts.privileged
      ? [{ href: "/responder/verification", label: "Verification" }]
      : []),
    { href: "/responder/incidents", label: "Incidents" },
    { href: "/responder/settings", label: "Settings" },
  ];
  if (opts.privileged) {
    return [
      ...base,
      { href: "/admin/dashboard", label: "Control center" },
    ];
  }
  // Pending responders should land on verification first.
  if (!opts.verified && opts.hasResponderRole) {
    return [
      { href: "/responder/verification", label: "Verification" },
      { href: "/responder/dashboard", label: "Dashboard" },
      { href: "/responder/profile", label: "Profile" },
      { href: "/responder/incidents", label: "Incidents" },
      { href: "/responder/settings", label: "Settings" },
    ];
  }
  return base;
}

export default async function ResponderLayout({
  children,
}: {
  children: ReactNode;
}) {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const privileged = isPrivileged(user);
  const responder = isResponder(user);

  // Privileged staff bypass the responder-role gate (and the verification
  // phase). Responders pass through. Everyone else goes to /dashboard
  // (citizen home) — never to /responder/verification, which lives *inside*
  // this layout and would loop.
  if (!privileged && !responder) redirect("/dashboard");

  const verificationStatus = responder
    ? await getResponderVerificationStatus(user.id)
    : null;
  const verified = verificationStatus === "verified";
  const primaryRole = getPrimaryRole(user);
  const links = responderLinks({ privileged, verified, hasResponderRole: responder });

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-8 md:flex-row">
      <aside className="md:w-56 md:shrink-0">
        <nav aria-label="Responder" className="space-y-1 rounded-xl border border-slate-200 bg-white p-3">
          <p className="px-2 pb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
            Responder
          </p>
          <p className="px-2 pb-2">
            <Badge tone={privileged ? "navy" : "neutral"}>
              {privileged ? `${roleLabel(primaryRole)} · staff` : roleLabel(primaryRole)}
            </Badge>
          </p>
          {privileged && (
            <p className="rounded-md bg-blue-50 px-2 py-2 text-xs leading-relaxed text-slate-700">
              Staff access — responder verification is bypassed for the control
              center. Responder duty mode and GPS still require a verified
              responder profile.
            </p>
          )}
          {!privileged && responder && !verified && (
            <p className="rounded-md bg-orange-50 px-2 py-2 text-xs leading-relaxed text-slate-700">
              Verification {verificationStatus ?? "pending"} — you cannot go on
              duty until verified. Complete verification to unlock duty mode.
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
        </nav>
      </aside>
      <section className="flex-1">{children}</section>
    </div>
  );
}
