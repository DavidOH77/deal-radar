import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  agentRules: false,
  allowedDevOrigins: ["127.0.0.1"],
  devIndicators: false,
  turbopack: {
    root: process.cwd()
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "cdn.algumon.com" },
      { protocol: "https", hostname: "img.eomisae.co.kr" },
      { protocol: "https", hostname: "**.fmkorea.com" },
      { protocol: "https", hostname: "**.ppomppu.co.kr" },
      { protocol: "https", hostname: "**.pstatic.net" },
      { protocol: "https", hostname: "**.naver.net" },
      { protocol: "https", hostname: "cdn.011st.com" },
      { protocol: "https", hostname: "**.coupangcdn.com" },
      { protocol: "https", hostname: "gdimg.gmarket.co.kr" },
      { protocol: "https", hostname: "**.quasarzone.com" },
      { protocol: "https", hostname: "**.ssgcdn.com" }
    ]
  }
};

export default nextConfig;
