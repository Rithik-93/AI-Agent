import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    // Disable TypeScript type checking during the build
    ignoreBuildErrors: true,
  },
  eslint: {
    // Disable ESLint linting during the build
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
