import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["exceljs", "@neondatabase/serverless", "ws"],
};

export default nextConfig;
