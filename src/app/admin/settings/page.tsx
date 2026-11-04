"use client";

import { Card, CardHeader, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function AdminSettingsPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Platform settings</h1>
      <Card>
        <CardHeader
          title="Integrations & security"
          description="Super-admin only: global permissions, MFA policy, CAPTCHA/rate-limit thresholds, push keys, and storage retention."
        />
        <CardBody>
          <p className="text-sm text-slate-600">
            These controls write to a future platform_settings table. Until the
            settings API ships (Phase 7), configuration is managed through
            environment variables and the Supabase dashboard — never hardcoded
            secrets in source.
          </p>
          <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-slate-600">
            <li>Required env: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY</li>
            <li>Optional: NEXT_PUBLIC_MAP_TILES_URL, TURNSTILE_SECRET (CAPTCHA), VAPID keys (Web Push), Firebase service account (mobile push)</li>
            <li>MFA is required for verification officers and administrators (Supabase Auth policy).</li>
          </ul>
          <div className="mt-4">
            <Button
              variant="secondary"
              onClick={() => window.alert("Settings UI ships in Phase 7. Configure via env vars until then.")}
            >
              Open configuration guidance
            </Button>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
