import type { NextConfig } from "next";

const legacyAttributeRoutes = ["discipline", "career", "trading", "physical-health", "self-development"];

const nextConfig: NextConfig = {
  // Produces .next/standalone - a self-contained server bundle (minimal
  // traced node_modules + a server.js entry point) used by the Tauri
  // desktop shell (see src-tauri/src/lib.rs and `npm run build:desktop`).
  // This does NOT change `next dev`/`next start`/the regular browser
  // build in any way - it only changes what `next build` additionally
  // emits, and every server feature (redirects below, the Supabase auth
  // proxy, the /auth/callback route) keeps working exactly as before,
  // unlike `output: "export"` (static export), which would break all of
  // them - see the desktop migration audit report for why that path was
  // ruled out.
  output: "standalone",
  async redirects() {
    return legacyAttributeRoutes.map((attributeId) => ({
      source: `/${attributeId}`,
      destination: `/attributes/${attributeId}`,
      permanent: false,
    }));
  },
};

export default nextConfig;
