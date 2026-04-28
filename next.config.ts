import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ['node-zklib', 'bcryptjs', 'node-cron', 'jspdf', 'pg'],
  allowedDevOrigins: ['192.168.1.132', '192.168.1.139', '192.168.3.32', 'hrms.thefoundrys.com'],
};

export default nextConfig;
