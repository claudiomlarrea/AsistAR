import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["exceljs", "@neondatabase/serverless", "ws"],
  experimental: {
    proxyClientMaxBodySize: "5mb",
  },
};

export default nextConfig;
