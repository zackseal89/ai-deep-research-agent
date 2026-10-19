import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  serverExternalPackages: ["@copilotkit/runtime", "@langchain/core", "langchain"],
  // @ts-expect-error Next.js 16 internal flag
  agentRules: false,
  webpack: (config) => {
    config.resolve = config.resolve || {};
    config.resolve.alias = config.resolve.alias || {};
    config.resolve.alias["react-syntax-highlighter"] = path.resolve(
      process.cwd(),
      "node_modules/react-syntax-highlighter/dist/esm/index.js"
    );
    config.resolve.alias["lucide"] = path.resolve(
      process.cwd(),
      "node_modules/lucide/index.mjs"
    );
    config.resolve.alias["mermaid"] = path.resolve(
      process.cwd(),
      "node_modules/mermaid/dist/mermaid.core.mjs"
    );
    return config;
  },
};

export default nextConfig;

