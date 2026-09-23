import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  experimental: {
    // Page `blocks` are schemaless JSONB and can carry a lot of copy; the 1MB
    // default rejects a large page save with an opaque error.
    serverActions: { bodySizeLimit: "2mb" },
  },
};

export default nextConfig;
