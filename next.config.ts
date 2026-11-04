import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Next.js 16: Turbopack is used by default for dev and build.
  reactCompiler: true,
  cacheComponents: false,
  partialPrefetching: false,
  serverExternalPackages: ["@supabase/supabase-js"],
};

export default nextConfig;
