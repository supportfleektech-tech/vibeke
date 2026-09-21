import type { NextConfig } from "next";

// PWA — zero-budget setup:
// next-pwa is NOT installed (see package.json). For zero-budget, we ship manual manifest.json + placeholder sw.js.
// If next-pwa is added later (`pnpm add next-pwa`), replace this with:
//   import withPWA from "next-pwa";
//   const pwa = withPWA({ dest: "public", register: true, skipWaiting: true });
//   export default pwa(nextConfig);
// Current config works without next-pwa — manifest + sw.js are served statically from /public.

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "images.pexels.com" },
      { protocol: "https", hostname: "pexels.com" },
    ],
    formats: ["image/avif", "image/webp"],
  },
  compress: true,
  poweredByHeader: false,
  experimental: {
    optimizePackageImports: ["lucide-react", "motion"],
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(self)" },
        ],
      },
    ];
  },
};

export default nextConfig;
