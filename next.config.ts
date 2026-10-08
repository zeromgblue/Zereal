import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Fully client-side app, exported as static files for Firebase Hosting.
  output: "export",
  reactStrictMode: false,
  images: { unoptimized: true },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
