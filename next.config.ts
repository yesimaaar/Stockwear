import path from "node:path";
import { fileURLToPath } from "node:url";
import type { NextConfig } from "next";

const hereDir = path.dirname(fileURLToPath(import.meta.url));
const enableTfjsNode = process.env.ENABLE_TFJS_NODE === "true";

const nextConfig: NextConfig = {
  compress: true,
  reactCompiler: false,
  // Configuración vacía de Turbopack para silenciar el warning (Next.js 16+)
  turbopack: {},
  // Optimizaciones experimentales para mejorar LCP y TTFB
  experimental: {
    optimizeCss: true,
    optimizePackageImports: [
      "lucide-react",
      "@radix-ui/react-icons",
      "@radix-ui/react-dropdown-menu",
      "@radix-ui/react-dialog",
      "@radix-ui/react-popover",
      "@radix-ui/react-select",
      "@radix-ui/react-tooltip",
      "lucide-react",
    ],
  },
  modularizeImports: {
    "@radix-ui/react-icons": {
      transform: "@radix-ui/react-icons/{{member}}",
    },
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
      },
    ],
    formats: ["image/avif", "image/webp"],
    deviceSizes: [360, 640, 768, 1024, 1280, 1536, 1920],
    imageSizes: [16, 32, 48, 64, 96, 128, 256],
  },
  webpack: (config, { isServer, dev }) => {
    config.resolve ??= {};
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      path: false,
      crypto: false,
    };

    // Disable source maps in development to avoid "Invalid source map" errors
    if (dev) {
      config.devtool = false;
      config.ignoreWarnings = [
        ...(config.ignoreWarnings || []),
        /Failed to parse source map/,
        /Invalid source map/,
      ];
    }

    config.resolve.alias = {
      ...(config.resolve.alias ?? {}),
      "@mapbox/node-pre-gyp/lib/util/nw-pre-gyp": path.resolve(hereDir, "config", "nw-pre-gyp-stub.js"),
      "@mapbox/node-pre-gyp/lib/util/nw-pre-gyp/index.html": path.resolve(
        hereDir,
        "config",
        "nw-pre-gyp-stub.js",
      ),
      "mock-aws-s3": false,
      "aws-sdk": false,
      nock: false,
      rimraf: false,
      "@/lib/server/embeddings": enableTfjsNode
        ? path.resolve(hereDir, "lib", "server", "embeddings.ts")
        : path.resolve(hereDir, "lib", "server", "embeddings-disabled.ts"),
    };

    if (!enableTfjsNode) {
      config.resolve.alias["@tensorflow/tfjs-node"] = false;
      config.resolve.alias["@mapbox/node-pre-gyp"] = false;
    }

    if (isServer) {
      const externalModules = [
        "aws-sdk",
        "mock-aws-s3",
        "nock",
        "rimraf",
      ];
      const existingExternals = config.externals ?? [];

      config.externals = [
        ...(Array.isArray(existingExternals)
          ? existingExternals
          : existingExternals
            ? [existingExternals]
            : []),
        ...externalModules,
      ];
    }

    return config;
  },
  async headers() {
    return [
      // Páginas estáticas como login, register - caché corto para TTFB
      {
        source: "/(login|register|forgot-password)",
        headers: [
          {
            key: "Cache-Control",
            value: "public, s-maxage=60, stale-while-revalidate=300",
          },
        ],
      },
      {
        source: "/:all*(svg|jpg|jpeg|png|gif|webp|avif|ico)",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
      {
        source: "/:all*(woff2|woff|ttf|otf)",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
          {
            key: "Access-Control-Allow-Origin",
            value: "*",
          },
        ],
      },
      {
        source: "/:all*(wasm)",
        headers: [
          {
            key: "Content-Type",
            value: "application/wasm",
          },
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
          {
            key: "Access-Control-Allow-Origin",
            value: "*",
          },
        ],
      },
      {
        source: "/_next/static/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
      {
        source: "/api/tfhub-proxy/:path*",
        headers: [
          {
            key: "Access-Control-Allow-Origin",
            value: "*",
          },
          {
            key: "Cache-Control",
            value: "public, max-age=86400",
          },
        ],
      },
    ];
  },
  serverExternalPackages: enableTfjsNode
    ? ["@tensorflow/tfjs-node", "@mapbox/node-pre-gyp", "canvas"]
    : ["@mapbox/node-pre-gyp", "canvas"],
};

export default nextConfig;