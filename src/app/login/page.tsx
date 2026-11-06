"use client";

import { Suspense, useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardBody } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/client";

/** Validate an internal `next` target (rejects absolute + protocol-relative). */
function safeNext(raw: string | null): string | null {
  if (!raw) return null;
  const value = raw.trim();
  if (
    !value.startsWith("/") ||
    value.startsWith("//") ||
    value.startsWith("/\\") ||
    value.includes("\\") ||
    value === "/login"
  ) {
    return null;
  }
  return value;
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextParam = safeNext(searchParams.get("next"));
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      // Server-side authoritative check (fresh per request, not inlined into
      // the client bundle at build time). This is the source of truth for
      // whether Supabase is configured for the deployed build.
      const probe = await fetch("/api/v1/health");
      const probeJson = (await probe.json()) as {
        success: boolean;
        data?: { configured: boolean };
      };
      if (!probeJson.success || !probeJson.data?.configured) {
        setError("Backend not configured. See README.md “Running locally”.");
        setBusy(false);
        return;
      }
      const supabase = createClient();
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (signInError) {
        setError(signInError.message);
        setBusy(false);
        return;
      }

      // Role-aware landing: an explicit `next` wins (proxy still enforces
      // auth + layouts still enforce roles). Otherwise the authoritative
      // /api/v1/auth/me resolver picks control center vs responder
      // dashboard vs verification. Fallback is /dashboard (server gateway).
      let destination = nextParam ?? "/dashboard";
      if (!nextParam) {
        try {
          const me = await fetch("/api/v1/auth/me");
          if (me.ok) {
            const json = (await me.json()) as {
              success: boolean;
              data?: { dashboardPath?: string };
            };
            const path = json.data?.dashboardPath;
            if (typeof path === "string" && path.startsWith("/") && !path.startsWith("//")) {
              destination = path;
            }
          }
        } catch {
          destination = "/dashboard";
        }
      }
      router.push(destination);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign-in failed.");
      setBusy(false);
    }
  };

  return (
    <Card>
      <CardHeader
        title="Sign in to CIVIRESPOND"
        description="Responders, verification officers, and administrators sign in here. Citizens can report without an account."
      />
      <CardBody>
        <form onSubmit={submit} className="space-y-4">
          {error && (
            <p role="alert" className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">
              {error}
            </p>
          )}
          <div>
            <label className="mb-1 block text-sm font-semibold" htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2"
              autoComplete="email"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-semibold" htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2"
              autoComplete="current-password"
            />
          </div>
          <Button type="submit" disabled={busy} className="w-full">
            {busy ? "Signing in…" : "Sign in"}
          </Button>
          <p className="text-center text-sm text-slate-600">
            Want to help?{" "}
            <a className="underline" href="/become-a-responder">
              Become a responder
            </a>
          </p>
          <p className="text-center text-xs leading-relaxed text-slate-500">
            After sign-in you land on the dashboard for your role: verified
            responders open the responder dashboard, staff (verification
            officer / administrator / super admin) open the control center and
            bypass responder verification, and pending responders complete
            verification first.
          </p>
        </form>
      </CardBody>
    </Card>
  );
}

export default function LoginPage() {
  return (
    <div className="mx-auto max-w-md px-4 py-14">
      <Suspense fallback={null}>
        <LoginForm />
      </Suspense>
    </div>
  );
}
