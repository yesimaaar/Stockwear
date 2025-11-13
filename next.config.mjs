import path from "node:path";
import { fileURLToPath } from "node:url";

const hereDir = path.dirname(fileURLToPath(import.meta.url));
const enableTfjsNode = process.env.ENABLE_TFJS_NODE === "true";

/** @type {import('next').NextConfig} */
const nextConfig = {
  compress: true,
  modularizeImports: {
    "lucide-react": {
      transform: "lucide-react/dist/esm/icons/{{member}}",
    },
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
  serverExternalPackages: enableTfjsNode
    ? ["@tensorflow/tfjs-node", "@mapbox/node-pre-gyp", "canvas"]
    : ["@mapbox/node-pre-gyp", "canvas"],
  webpack: (config, { isServer }) => {
    config.resolve ??= {};
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      path: false,
      crypto: false,
    };

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
      const externalModules = ["aws-sdk", "mock-aws-s3", "nock", "rimraf"];
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
};

export default nextConfig;
