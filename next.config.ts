import type { NextConfig } from "next";

const nextConfig: NextConfig = {
    serverExternalPackages: ["puppeteer", "node-cron"],
};

export default nextConfig;
