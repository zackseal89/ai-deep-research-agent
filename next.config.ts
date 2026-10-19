import type { NextConfig } from "next";
import type { Configuration } from "webpack";
import path from "path";

const nextConfig: NextConfig = {
  serverExternalPackages: ["@copilotkit/runtime", "@langchain/core", "langchain"],
  agentRules: false,
  webpack: (config: Configuration) => {
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
    config.resolve.alias["lucide-react"] = path.resolve(
      process.cwd(),
      "src/components/icons.tsx"
    );
    config.resolve.alias["mermaid"] = path.resolve(
      process.cwd(),
      "node_modules/mermaid/dist/mermaid.core.mjs"
    );
    return config;
  },
};

export default nextConfig;

