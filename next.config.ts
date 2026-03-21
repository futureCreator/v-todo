import type { NextConfig } from "next";

const basePath = "/proxy/todo";

const nextConfig: NextConfig = {
  basePath,
  allowedDevOrigins: ["*"],
  env: {
    NEXT_PUBLIC_BASE_PATH: basePath,
  },
};

export default nextConfig;
