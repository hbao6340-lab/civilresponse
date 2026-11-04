import Link from "next/link";
import { SITE, EMERGENCY_NUMBERS } from "@/lib/constants";

export function SiteFooter() {
  return (
    <footer className="border-t border-slate-200 bg-white">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 text-sm md:grid-cols-4">
        <div className="md:col-span-2">
          <p className="font-bold text-[#0b2545]">{SITE.fullName}</p>
          <p className="mt-1 text-slate-600">{SITE.tagline}</p>
          <p className="mt-3 max-w-md text-slate-500">
            An independent, community-operated platform covering {SITE.city}.
            Volunteers are never presented as official police, firefighters or
            ambulance staff. Always contact official emergency services (police{" "}
            {EMERGENCY_NUMBERS.police}, fire {EMERGENCY_NUMBERS.fire}, medical{" "}
            {EMERGENCY_NUMBERS.ambulance}) in a life-threatening emergency.
          </p>
        </div>
        <nav aria-label="Platform">
          <p className="font-semibold text-slate-700">Platform</p>
          <ul className="mt-2 space-y-1 text-slate-600">
            <li><Link className="hover:text-[#0b2545]" href="/map">Responder map</Link></li>
            <li><Link className="hover:text-[#0b2545]" href="/report">Report emergency</Link></li>
            <li><Link className="hover:text-[#0b2545]" href="/become-a-responder">Become a responder</Link></li>
            <li><Link className="hover:text-[#0b2545]" href="/about">About CIVIRESPOND</Link></li>
          </ul>
        </nav>
        <nav aria-label="Legal and safety">
          <p className="font-semibold text-slate-700">Legal &amp; safety</p>
          <ul className="mt-2 space-y-1 text-slate-600">
            <li><Link className="hover:text-[#0b2545]" href="/privacy">Privacy policy</Link></li>
            <li><Link className="hover:text-[#0b2545]" href="/terms">Terms of service</Link></li>
            <li><Link className="hover:text-[#0b2545]" href="/safety">Safety guidance</Link></li>
          </ul>
        </nav>
      </div>
      <div className="border-t border-slate-200 px-4 py-4 text-center text-xs text-slate-500">
        © {new Date().getFullYear()} {SITE.name} · Independent community platform — not an official emergency dispatch service.
      </div>
    </footer>
  );
}
