import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  // @ts-expect-error - eslint config missing in NextConfig type
  eslint: {
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
