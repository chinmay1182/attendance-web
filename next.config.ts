import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here - trigger rebuild */
  typescript: {
    ignoreBuildErrors: true,
  },
  experimental: {
    // @ts-expect-error - React Compiler is a valid option in Next.js 16+
    reactCompiler: true,
    optimizePackageImports: ['date-fns', 'recharts', 'leaflet', 'firebase', '@supabase/supabase-js'],
  },
  output: "standalone",

};

export default nextConfig;
