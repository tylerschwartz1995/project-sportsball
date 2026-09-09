import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Vercel packages functions through its adapter; standalone is for Docker.
  output: process.env.VERCEL === "1" ? undefined : "standalone",
};

export default nextConfig;
