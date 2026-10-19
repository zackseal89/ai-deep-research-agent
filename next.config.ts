import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["@copilotkit/runtime", "@langchain/core", "langchain"],
};

export default nextConfig;
