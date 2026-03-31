import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ['mongoose', 'bcryptjs', 'node-cron', 'jspdf', 'pg'],
};

export default nextConfig;
