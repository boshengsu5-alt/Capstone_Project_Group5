import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // ── Image Optimization for Vercel ──────────────────────────────────────────
  // Allow images from Supabase Storage CDN
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "ysmctiqieghqlcnuoauv.supabase.co",
        port: "",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },

  // ── Security Headers ────────────────────────────────────────────────────────
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          // Prevent clickjacking
          { key: "X-Frame-Options", value: "DENY" },
          // Prevent MIME type sniffing
          { key: "X-Content-Type-Options", value: "nosniff" },
          // Referrer policy
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          // XSS protection (legacy browsers)
          { key: "X-XSS-Protection", value: "1; mode=block" },
          // Permissions Policy — disable unnecessary browser features
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
        ],
      },
    ];
  },

  // ── Output / Build config ───────────────────────────────────────────────────
  // Vercel auto-detects Next.js; no special output mode needed.
  // Turbopack is used by default in Next.js 16 dev.
};

export default nextConfig;
