import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  eslint: {
    ignoreDuringBuilds: true, // 👈 disables ESLint errors from blocking production builds
  },
};

export default nextConfig;
