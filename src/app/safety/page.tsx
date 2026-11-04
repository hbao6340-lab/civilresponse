import type { Metadata } from "next";
import { SITE, EMERGENCY_NUMBERS } from "@/lib/constants";

export const metadata: Metadata = {
  title: `Safety guidance — ${SITE.name}`,
};

export default function SafetyPage() {
  return (
    <article className="mx-auto max-w-3xl px-4 py-12 prose prose-slate">
      <h1>Safety guidance</h1>
      <div className="rounded-xl border border-red-200 bg-red-50 p-4 not-prose">
        <p className="font-semibold text-red-900">
          If anyone is in immediate danger, call now: police{" "}
          {EMERGENCY_NUMBERS.police} · fire {EMERGENCY_NUMBERS.fire} · medical{" "}
          {EMERGENCY_NUMBERS.ambulance}. Do not wait for a community responder.
        </p>
      </div>
      <h2>For citizens reporting</h2>
      <ul>
        <li>Move to a safe place first. Never re-enter a burning building or approach a dangerous scene to take photos.</li>
        <li>Give your exact location, landmark, and a callback number to the official operator.</li>
        <li>On CIVIRESPOND, keep your tracking reference private — anyone with the link can view the incident.</li>
        <li>Meet responders only in a safe, public location when possible, and let a trusted person know where you are.</li>
        <li>Do not confront anyone involved in violence. Share what you safely observed with official responders.</li>
      </ul>
      <h2>For responders</h2>
      <ul>
        <li>Never claim to be a police officer, firefighter, or paramedic. Identify yourself as a community volunteer.</li>
        <li>Do not accept assignments beyond your training or comfort. Decline and escalate when in doubt.</li>
        <li>Assess the scene from a safe distance before approaching. Withdraw if the situation becomes dangerous and notify the incident channel.</li>
        <li>Protect personal data: never share exact locations, documents, or contact details in public channels.</li>
        <li>Keep duty mode simple: if you stop sharing or go off duty, explain briefly in the incident channel so citizens are not left waiting.</li>
      </ul>
      <h2>Reporting false or unsafe content</h2>
      <p>
        If you believe a report is false, if you feel unsafe, or if you see
        misuse of the platform, contact the platform administrators or the
        official services. Moderation decisions are recorded in the audit log
        and can be appealed.
      </p>
    </article>
  );
}
