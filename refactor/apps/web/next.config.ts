import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  experimental: {
    externalDir: true
  }
};

export default nextConfig;
