import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Next.js 16: Turbopack is used by default for dev and build (no webpack config here).
  reactCompiler: true,
  cacheComponents: false,
  partialPrefetching: false,
  experimental: {
    // PPR-style config was removed in Next 16; the top-level options above
    // are inert for this foundation build and remain only as markers.
    ppr: false,
  } as Record<string, unknown>,
  turbopack: {},
  serverExternalPackages: ["@supabase/supabase-js"],
};

export default nextConfig;
