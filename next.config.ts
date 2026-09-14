import type { NextConfig } from "next";

const isMobile = process.env.MOBILE_BUILD === "true";

const nextConfig: NextConfig = {
  output: isMobile ? "export" : "standalone",
  images: {
    unoptimized: true,
  },
  trailingSlash: isMobile,
  serverExternalPackages: ["pdf-parse"],
};

export default nextConfig;
