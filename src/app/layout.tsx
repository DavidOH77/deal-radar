import type { Metadata } from "next";
import "pretendard/dist/web/variable/pretendardvariable.css";
import { BRAND } from "@/lib/brand";
import "./globals.css";

const MATERIAL_SYMBOLS_URL = "https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:FILL@0..1&icon_names=add,check,check_circle,close,delete,expand_more,favorite,image_not_supported,info,key,logout,notifications,notifications_active,refresh,search,search_off,settings,share,trending_up,tune,visibility,warning&display=block";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "https://deal-radar-lac.vercel.app"),
  title: `${BRAND.name} | ${BRAND.shortDescription}`,
  description: BRAND.description,
  applicationName: BRAND.name,
  icons: { icon: "/icon.svg" }
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="stylesheet" href={MATERIAL_SYMBOLS_URL} />
      </head>
      <body>{children}</body>
    </html>
  );
}
