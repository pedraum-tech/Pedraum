import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  images: {
    // Combinando os domínios do Firebase e do UploadThing
    domains: ["firebasestorage.googleapis.com", "utfs.io"],
    // Dica: No futuro, considere migrar 'domains' para 'remotePatterns' que é mais seguro
  },
  webpack: (config) => {
    // Mantendo a correção do PDF.js que estava no seu arquivo TS
    config.module.rules.push({
      test: /pdfjs-dist\/build\/pdf\.mjs$/,
      type: "javascript/auto",
    });

    return config;
  },
};

export default nextConfig;