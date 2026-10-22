import type { NextConfig } from "next";

const isMobile = process.env.MOBILE_BUILD === "true";
const isVercel = Boolean(process.env.VERCEL);

const nextConfig: NextConfig = {
  output: isMobile ? "export" : isVercel ? undefined : "standalone",
  outputFileTracingIncludes: {
    "/**": ["./seed/**/*"],
  },
  images: {
    unoptimized: true,
  },
  trailingSlash: isMobile,
  serverExternalPackages: ["pdf-parse"],
  devIndicators: false,
};

export default nextConfig;
