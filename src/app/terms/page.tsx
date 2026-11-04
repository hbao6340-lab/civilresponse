import type { Metadata } from "next";
import { SITE, EMERGENCY_NUMBERS } from "@/lib/constants";

export const metadata: Metadata = {
  title: `Terms of service — ${SITE.name}`,
};

export default function TermsPage() {
  return (
    <article className="mx-auto max-w-3xl px-4 py-12 prose prose-slate">
      <h1>Terms of service</h1>
      <p>
        <em>Version 1.0 — {SITE.name}. These terms govern use of the
        platform. Legal review is required before public deployment.</em>
      </p>
      <h2>1. Community platform — not an official service</h2>
      <p>
        {SITE.name} is an independent community coordination platform. It is
        not an official emergency dispatch system. In any emergency involving
        risk to life, contact the official services first: police{" "}
        {EMERGENCY_NUMBERS.police}, fire {EMERGENCY_NUMBERS.fire}, medical{" "}
        {EMERGENCY_NUMBERS.ambulance}.
      </p>
      <h2>2. No guarantee of response</h2>
      <p>
        The platform cannot guarantee that a responder will be available,
        accept a report, or reach you within any timeframe. Never delay
        seeking professional emergency assistance while waiting for a community
        responder.
      </p>
      <h2>3. Volunteer status</h2>
      <p>
        Responders are community volunteers. They are not police officers,
        firefighters, paramedics, or government officials unless separately
        verified and legally authorised. Their presence does not constitute
        an official response.
      </p>
      <h2>4. Accurate reports only</h2>
      <p>
        Submitting a knowingly false report is prohibited and may be reported
        to the authorities. Reports are reviewed, and false reports are
        recorded as such.
      </p>
      <h2>5. Safety</h2>
      <p>
        Do not place yourself in danger. Follow the{" "}
        <a href="/safety">safety guidance</a>. If a situation appears violent
        or unsafe, withdraw and call {EMERGENCY_NUMBERS.police}.
      </p>
      <h2>6. Location sharing</h2>
      <p>
        GPS sharing is voluntary and consent-based. Responders may stop at any
        time. The public map shows approximate positions only. Browser
        background tracking is not offered; when the browser is closed or
        suspended, location sharing stops.
      </p>
      <h2>7. Acceptable use &amp; enforcement</h2>
      <p>
        Abuse, spam, harassment, or attempted unauthorised access may result in
        suspension of accounts and verification status. All moderation and
        administrative actions are audit-logged.
      </p>
      <h2>8. Liability</h2>
      <p>
        To the extent permitted by law, the platform and its operators are not
        liable for actions taken by volunteers or for any delay in community
        response. Nothing limits liability that cannot be limited under
        Vietnamese law.
      </p>
    </article>
  );
}
