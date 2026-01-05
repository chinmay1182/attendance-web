import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  experimental: {
    // @ts-expect-error - React Compiler is a valid option in Next.js 16+
    reactCompiler: true,
  },
  output: "standalone",

};

export default nextConfig;
