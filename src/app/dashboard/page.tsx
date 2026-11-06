import Link from "next/link";
import { redirect } from "next/navigation";
import {
  getDashboardPath,
  getPrimaryRole,
  getResponderVerificationStatus,
  getSessionUser,
  isPrivileged,
  isResponder,
  roleLabel,
} from "@/lib/auth";
import { env } from "@/lib/env";
import { Card, CardHeader, CardBody } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

/**
 * /dashboard — signed-in control center gateway.
 *
 * Server-resolved routing:
 * - Unauthenticated → /login
 * - Privileged staff (verification_officer / administrator / super_admin)
 *   bypass the responder verification phase → /admin/dashboard
 * - Verified responders → /responder/dashboard
 * - Pending/rejected responders → /responder/verification
 * - Citizens → this page (signed-in home)
 */
export default async function DashboardPage() {
  if (!env.isSupabaseConfigured) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-14">
        <Card>
          <CardHeader
            title="Control center unavailable"
            description="The backend is not configured in this deployment."
          />
          <CardBody>
            <p className="text-sm text-slate-600">
              Set <code className="rounded bg-slate-100 px-1">NEXT_PUBLIC_SUPABASE_URL</code>{" "}
              and{" "}
              <code className="rounded bg-slate-100 px-1">NEXT_PUBLIC_SUPABASE_ANON_KEY</code>{" "}
              (see README.md “Running locally”), then sign in again to open your
              role-specific dashboard.
            </p>
            <div className="mt-4 flex gap-2">
              <Link
                href="/login"
                className="rounded-md bg-[#0b2545] px-4 py-2 text-sm font-semibold text-white hover:bg-[#13315c]"
              >
                Go to sign in
              </Link>
              <Link
                href="/"
                className="rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Back home
              </Link>
            </div>
          </CardBody>
        </Card>
      </div>
    );
  }

  const user = await getSessionUser();
  if (!user) redirect("/login");

  const verificationStatus = isResponder(user)
    ? await getResponderVerificationStatus(user.id)
    : null;

  // Privileged + responder routes redirect to their dedicated dashboards.
  // Citizens render below as the shared signed-in home.
  if (isPrivileged(user)) redirect("/admin/dashboard");
  if (isResponder(user)) {
    redirect(getDashboardPath(user, verificationStatus));
  }

  const primaryRole = getPrimaryRole(user);

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Control center</h1>
          <p className="text-sm text-slate-600">
            Signed in as {user.email ?? "account"} · {roleLabel(primaryRole)}
          </p>
        </div>
        <Badge tone="navy">{roleLabel(primaryRole)}</Badge>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader title="Report an emergency" description="File a report and track the response with a private link. Call 113 / 114 / 115 first for immediate danger." />
          <CardBody>
            <div className="flex gap-2">
              <Link
                href="/report"
                className="rounded-md bg-red-700 px-4 py-2 text-sm font-semibold text-white hover:bg-red-800"
              >
                Report emergency
              </Link>
              <Link
                href="/map"
                className="rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                View map
              </Link>
            </div>
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="Become a responder" description="Volunteer responders go through a verification phase before they can go on duty." />
          <CardBody>
            <Link
              href="/become-a-responder"
              className="rounded-md bg-[#0b2545] px-4 py-2 text-sm font-semibold text-white hover:bg-[#13315c]"
            >
              Apply to be a responder
            </Link>
          </CardBody>
        </Card>
      </div>

      <Card className="mt-4">
        <CardHeader title="How dashboards work" description="Your destination after sign-in depends on your role." />
        <CardBody>
          <ul className="list-disc space-y-1 pl-5 text-sm text-slate-600">
            <li>Responder (verified) → responder dashboard with duty mode and GPS.</li>
            <li>Responder (pending) → verification page to upload documents.</li>
            <li>Verification Officer → control center: verification queue and map.</li>
            <li>Administrator → control center: plus incidents, users, and exports.</li>
            <li>Super Admin → control center: plus role management and settings.</li>
          </ul>
        </CardBody>
      </Card>
    </div>
  );
}
