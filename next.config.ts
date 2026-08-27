import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  agentRules: false,
  allowedDevOrigins: ["127.0.0.1"],
  devIndicators: false,
  ...(process.env.VERCEL === "1" ? {} : { output: "standalone" as const }),
  turbopack: {
    root: process.cwd()
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "cdn.algumon.com" },
      { protocol: "https", hostname: "img.eomisae.co.kr" },
      { protocol: "https", hostname: "img-cdn.theqoo.net" },
      { protocol: "https", hostname: "img1.daumcdn.net" },
      { protocol: "https", hostname: "t1.daumcdn.net" },
      { protocol: "https", hostname: "scrap.kakaocdn.net" },
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
