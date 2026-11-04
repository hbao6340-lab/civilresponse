import type { Metadata } from "next";
import { SITE } from "@/lib/constants";

export const metadata: Metadata = {
  title: `About — ${SITE.name}`,
  description: `What ${SITE.name} is, how verification works, and the limits of a community platform.`,
};

export default function AboutPage() {
  return (
    <article className="mx-auto max-w-3xl px-4 py-12 prose prose-slate">
      <h1>About {SITE.name}</h1>
      <p>
        <strong>{SITE.fullName}</strong> ({SITE.name}) —{" "}
        <em>{SITE.tagline}</em> — is an independent, community-operated platform
        serving {SITE.city}, Vietnam.
      </p>
      <h2>What it does</h2>
      <p>
        CIVIRESPOND maintains a public map of verified volunteer first
        responders who opt into visibility, accepts citizen emergency reports,
        matches them to nearby available responders using PostGIS geographic
        search, and provides secure coordination and incident tracking.
      </p>
      <h2>What it is not</h2>
      <p>
        CIVIRESPOND is not an official emergency dispatch system and does not
        replace the police, fire, or medical services. Volunteers are community
        members — they are never represented as official police officers,
        firefighters, or ambulance workers. In a life-threatening emergency,
        always call the official numbers first.
      </p>
      <h2>Verification</h2>
      <p>
        Responders must submit identity and, where relevant, qualification
        documents. Verification officers review each application before a
        responder can appear on the public map, go on duty, or receive
        incident alerts. Decisions are recorded in the audit log.
      </p>
      <h2>Privacy by design</h2>
      <p>
        Live GPS is consent-based and duty-gated: it only flows while a
        verified responder is on duty, has explicitly consented, and has
        granted browser location permission. The public map receives only
        approximate, privacy-offset positions; exact coordinates are restricted
        to authorised operational views. Precise locations, identity documents,
        and contact details are never exposed to anonymous visitors.
      </p>
      <h2>Getting involved</h2>
      <p>
        Citizens can report an emergency or browse the map without an account.
        People who wish to serve as responders can apply via{" "}
        <a href="/become-a-responder">Become a responder</a>. Administration
        and verification roles are provisioned by platform operators only.
      </p>
    </article>
  );
}
