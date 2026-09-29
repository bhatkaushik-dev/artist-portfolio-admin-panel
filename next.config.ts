import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  experimental: {
    // Page `blocks` are schemaless JSONB and can carry a lot of copy; the 1MB
    // default rejects a large page save with an opaque error.
    serverActions: { bodySizeLimit: "2mb" },
    // Every route here is dynamic (cookie-bound), and dynamic pages default to
    // no client cache at all — so flicking between Gallery and Pages re-ran
    // every API call each time. Thirty seconds makes going back instant, and
    // every mutation already calls revalidatePath / router.refresh, which
    // clears this cache, so nobody sees their own edit go stale.
    staleTimes: { dynamic: 30 },
  },
};

export default nextConfig;
