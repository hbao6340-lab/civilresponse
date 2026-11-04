import Link from "next/link";
import {
  ArrowRight,
  Map as MapIcon,
  Siren,
  Shield,
  Radio,
  Eye,
  FileText,
} from "lucide-react";
import { SITE, EMERGENCY_NUMBERS } from "@/lib/constants";
import { Card } from "@/components/ui/card";

const features = [
  {
    icon: MapIcon,
    title: "Citywide responder map",
    body: "Privacy-protected approximate locations of verified volunteers who have opted into public visibility across Ho Chi Minh City.",
  },
  {
    icon: Radio,
    title: "Proximity matching",
    body: "PostGIS-powered search finds the nearest available responders when an incident is reported.",
  },
  {
    icon: Shield,
    title: "Verified responders only",
    body: "Identity and qualification checks before any responder can go on duty or receive incident alerts.",
  },
  {
    icon: Eye,
    title: "Consent-first GPS",
    body: "Live location only flows while a verified responder is on duty, has consented, and keeps sharing. Stale fixes expire automatically.",
  },
];

const steps = [
  {
    icon: Siren,
    title: "1. Always call official services first",
    body: `Life-threatening emergency? Call police ${EMERGENCY_NUMBERS.police}, fire ${EMERGENCY_NUMBERS.fire}, or medical ${EMERGENCY_NUMBERS.ambulance} immediately. CIVIRESPOND coordinates community help — it never replaces official response.`,
  },
  {
    icon: FileText,
    title: "2. File a report",
    body: "Describe the situation, pin the location, and attach photos if safe. You'll receive a unique reference and a private tracking link.",
  },
  {
    icon: Radio,
    title: "3. Nearby responders are notified",
    body: "Eligible verified responders within range receive an alert and can accept or decline.",
  },
  {
    icon: MapIcon,
    title: "4. Track the response",
    body: "Track acceptance, en-route, and on-scene status from your private tracking page — no account required.",
  },
];

export default function HomePage() {
  return (
    <div>
      {/* Hero */}
      <section className="bg-[#0b2545] text-white">
        <div className="mx-auto max-w-7xl px-4 py-16 md:py-20">
          <p className="text-sm font-semibold uppercase tracking-widest text-slate-300">
            {SITE.city} · Independent community platform
          </p>
          <h1 className="mt-3 max-w-3xl text-4xl font-bold leading-tight md:text-5xl">
            {SITE.tagline}
          </h1>
          <p className="mt-4 max-w-2xl text-lg text-slate-200">
            CIVIRESPOND connects verified volunteer first responders with
            people who need help, anywhere in Ho Chi Minh City — with
            consent-based live location, transparent verification, and secure
            coordination.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/report"
              className="inline-flex items-center gap-2 rounded-md bg-red-700 px-5 py-3 font-semibold text-white hover:bg-red-800"
            >
              <Siren className="h-5 w-5" aria-hidden />
              Report an emergency
            </Link>
            <Link
              href="/map"
              className="inline-flex items-center gap-2 rounded-md bg-white px-5 py-3 font-semibold text-[#0b2545] hover:bg-slate-100"
            >
              <MapIcon className="h-5 w-5" aria-hidden />
              View responder map
            </Link>
            <Link
              href="/become-a-responder"
              className="inline-flex items-center gap-2 rounded-md border border-slate-400 px-5 py-3 font-semibold text-white hover:bg-white/10"
            >
              Become a responder
              <ArrowRight className="h-5 w-5" aria-hidden />
            </Link>
          </div>
          <p className="mt-6 max-w-2xl text-sm text-amber-200">
            If anyone is in immediate danger, call {EMERGENCY_NUMBERS.police}{" "}
            (police), {EMERGENCY_NUMBERS.fire} (fire) or{" "}
            {EMERGENCY_NUMBERS.ambulance} (medical) right now — before using
            this platform.
          </p>
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-7xl px-4 py-14">
        <h2 className="text-2xl font-bold text-slate-900">How it works</h2>
        <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {features.map((f) => (
            <Card key={f.title}>
              <div className="px-5 py-5">
                <f.icon className="h-6 w-6 text-[#0b2545]" aria-hidden />
                <h3 className="mt-3 font-semibold text-slate-900">{f.title}</h3>
                <p className="mt-1 text-sm text-slate-600">{f.body}</p>
              </div>
            </Card>
          ))}
        </div>

        <div className="mt-12">
          <h2 className="text-2xl font-bold text-slate-900">
            From report to response
          </h2>
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            {steps.map((s) => (
              <div
                key={s.title}
                className="flex gap-4 rounded-xl border border-slate-200 bg-white p-5"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#0b2545] text-white">
                  <s.icon className="h-5 w-5" aria-hidden />
                </span>
                <div>
                  <h3 className="font-semibold text-slate-900">{s.title}</h3>
                  <p className="mt-1 text-sm text-slate-600">{s.body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-12 rounded-xl border border-amber-200 bg-amber-50 p-5">
          <h2 className="font-semibold text-amber-900">An honest note</h2>
          <p className="mt-1 text-sm text-amber-800">
            CIVIRESPOND is an independent community coordination platform — not
            an official emergency dispatch system. Community volunteers are
            never presented as police, firefighters, or paramedics. Official
            services remain the correct first call for any emergency.
          </p>
        </div>
      </section>
    </div>
  );
}
