"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, ShieldAlert, X } from "lucide-react";
import { useState } from "react";
import { SITE, EMERGENCY_NUMBERS } from "@/lib/constants";
import { cn } from "@/lib/utils";

const links = [
  { href: "/", label: "Home" },
  { href: "/map", label: "Responder map" },
  { href: "/report", label: "Report emergency" },
  { href: "/about", label: "About" },
  { href: "/safety", label: "Safety" },
  { href: "/become-a-responder", label: "Become a responder" },
];

export function SiteHeader() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3">
        <Link href="/" className="flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#0b2545] text-white">
            <ShieldAlert className="h-5 w-5" aria-hidden />
          </span>
          <span className="leading-tight">
            <span className="block text-lg font-bold tracking-tight text-[#0b2545]">
              {SITE.name}
            </span>
            <span className="block text-[11px] text-slate-500">
              Community First Responder Network · {SITE.city}
            </span>
          </span>
        </Link>

        <nav aria-label="Primary" className="hidden items-center gap-1 lg:flex">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              aria-current={pathname === l.href ? "page" : undefined}
              className={cn(
                "rounded-md px-3 py-2 text-sm font-medium",
                pathname === l.href
                  ? "bg-slate-100 text-[#0b2545]"
                  : "text-slate-600 hover:bg-slate-50 hover:text-[#0b2545]",
              )}
            >
              {l.label}
            </Link>
          ))}
          <Link
            href="/login"
            className="ml-2 rounded-md bg-[#0b2545] px-4 py-2 text-sm font-semibold text-white hover:bg-[#13315c]"
          >
            Sign in
          </Link>
        </nav>

        <button
          type="button"
          className="rounded-md p-2 text-slate-700 hover:bg-slate-100 lg:hidden"
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
        >
          {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {open && (
        <nav aria-label="Mobile" className="border-t border-slate-200 px-4 py-2 lg:hidden">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="block rounded-md px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              onClick={() => setOpen(false)}
            >
              {l.label}
            </Link>
          ))}
          <Link
            href="/login"
            className="mt-1 block rounded-md bg-[#0b2545] px-4 py-2 text-center text-sm font-semibold text-white"
            onClick={() => setOpen(false)}
          >
            Sign in
          </Link>
        </nav>
      )}

      <p className="border-t border-slate-200 bg-red-50 px-4 py-2 text-center text-xs font-medium text-red-800">
        In an emergency, call the official services now: Police{" "}
        {EMERGENCY_NUMBERS.police} · Fire {EMERGENCY_NUMBERS.fire} · Medical{" "}
        {EMERGENCY_NUMBERS.ambulance}. CIVIRESPOND is a community coordination
        platform — never delay calling official services.
      </p>
    </header>
  );
}
