import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  // Exportação estática: funciona na Vercel, Netlify, Cloudflare Pages ou qualquer hospedagem de arquivos.
  output: "export",
  trailingSlash: true,
  images: { unoptimized: true },
  reactStrictMode: true,
  poweredByHeader: false,
  turbopack: { root: path.resolve(__dirname) },
};

export default nextConfig;
