import type { Metadata } from "next";
import { SITE } from "@/lib/constants";

export const metadata: Metadata = {
  title: `Privacy policy — ${SITE.name}`,
};

export default function PrivacyPage() {
  return (
    <article className="mx-auto max-w-3xl px-4 py-12 prose prose-slate">
      <h1>Privacy policy</h1>
      <p>
        <em>Version 1.0 — {SITE.name}. This page summarises how personal data
        is handled. A full Data Protection Impact Assessment and threat model
        are maintained in docs/SECURITY.md; legal review against Vietnamese
        Law No. 91/2025/QH15 is required before any public deployment.</em>
      </p>
      <h2>Data we collect</h2>
      <ul>
        <li>Account data (email, display name) for citizens who register, responders, and administrators.</li>
        <li>Responder verification documents (identity and qualification evidence) — private storage, access restricted to verification officers and administrators.</li>
        <li>Incident reports: category, description, location, address, affected persons, optional photos/video, optional contact details.</li>
        <li>Live GPS: only from verified responders who are on duty, have consented to location sharing, and grant browser permission. Each fix includes accuracy, heading and speed; the public map receives a privacy-offset approximation only.</li>
        <li>Operational records: incident events, assignments, messages, notifications, audit logs, and consent history.</li>
      </ul>
      <h2>Purposes</h2>
      <ul>
        <li>Providing the responder map, incident reporting, matching, notifications, and secure messaging.</li>
        <li>Verifying responder identity and qualifications.</li>
        <li>Maintaining audit trails for safety and accountability.</li>
      </ul>
      <h2>Never shared publicly</h2>
      <p>
        Exact GPS coordinates, identity documents, phone numbers, incident
        media and detailed incident descriptions are never shown to anonymous
        visitors. Row Level Security and server-side authorisation enforce
        least-privilege access.
      </p>
      <h2>Retention</h2>
      <p>
        Precise location history is retained only for a short operational
        window and expires automatically; stale fixes are never used for
        discovery. Verification documents and incident records follow the
        retention schedule in docs/SECURITY.md.
      </p>
      <h2>Your rights</h2>
      <p>
        Responders can stop sharing their location or go off duty at any time,
        ending GPS collection immediately. You may request access, correction,
        or deletion of your personal data by contacting the platform
        operators. Consent withdrawal is recorded in user_consents.
      </p>
    </article>
  );
}
