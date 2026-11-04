import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Next.js 16: Turbopack is used by default for dev and build.
  reactCompiler: true,
  cacheComponents: false,
  partialPrefetching: false,
  serverExternalPackages: ["@supabase/supabase-js"],
  // Inline NEXT_PUBLIC_* at build time so the browser bundle contains real
  // values even when the Turbopack `process` shim (module 47167) provides no
  // runtime env — without this the client sees env === undefined forever.
  env: {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL ?? "",
    NEXT_PUBLIC_MAP_TILES_URL: process.env.NEXT_PUBLIC_MAP_TILES_URL ?? "",
  },
};

export default nextConfig;
