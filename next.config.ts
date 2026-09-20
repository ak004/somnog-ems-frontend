import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Lets the Dockerfile copy just .next/standalone instead of node_modules.
  output: "standalone",
};

export default nextConfig;
