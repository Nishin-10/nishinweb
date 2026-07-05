import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            // Mic stays enabled for the voice assistant; the rest is off.
            value: "camera=(), geolocation=(), payment=(), usb=(), microphone=(self)",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
