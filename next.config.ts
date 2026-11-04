import path from "node:path";

import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // The floating dev badge sits over the landing copy; it is a local-only
  // authoring aid, not part of the product surface being demonstrated.
  devIndicators: false,
  serverExternalPackages: ["better-sqlite3"],
  turbopack: {
    rules: {
      // The registered OrbGallery canonical source is a plain .html module.
      // Turbopack has no ?raw loader for it, so a tiny loader exports the
      // file's text — the contract the authored component imports.
      "*.html": {
        loaders: [{ loader: path.join(process.cwd(), "scripts/turbo-raw-loader.cjs") }],
        // The loader emits JavaScript; `as` retypes the module so Turbopack
        // stops treating the .html source as an unknown asset type.
        as: "*.js",
      },
    },
  },
  experimental: {
    // The capability lattice is a client-only visual; keep bundle boundaries explicit.
    optimizePackageImports: ["lucide-react"],
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "DENY" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(), interest-cohort=()",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
