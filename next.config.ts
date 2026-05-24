import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    minimumCacheTTL: 0,
    /* Bypass optimization cache in dev so image swaps reflect instantly */
    unoptimized: process.env.NODE_ENV === "development",
  },
};

export default nextConfig;
