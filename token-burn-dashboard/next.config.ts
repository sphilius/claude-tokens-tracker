import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Fully static dashboard: `next build` emits a portable `out/` folder you can
  // host on any static host (GitHub Pages, Netlify, S3). No server needed.
  output: "export",
};

export default nextConfig;
