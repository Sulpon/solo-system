import type { NextConfig } from "next";

const legacyAttributeRoutes = ["discipline", "career", "trading", "physical-health", "self-development"];

const nextConfig: NextConfig = {
  async redirects() {
    return legacyAttributeRoutes.map((attributeId) => ({
      source: `/${attributeId}`,
      destination: `/attributes/${attributeId}`,
      permanent: false,
    }));
  },
};

export default nextConfig;
