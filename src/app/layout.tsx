import type { Metadata } from "next";
import "pretendard/dist/web/variable/pretendardvariable.css";
import "./globals.css";

const MATERIAL_SYMBOLS_URL = "https://fonts.googleapis.com/css2?family=Material+Symbols+Rounded:FILL@0..1&icon_names=add,check,check_circle,close,delete,expand_more,favorite,image_not_supported,info,key,logout,notifications,notifications_active,refresh,search,search_off,settings,share,trending_up,visibility,warning&display=block";

export const metadata: Metadata = {
  title: "딜레이더 | 여러 커뮤니티에서 지금 반응이 뜨는 딜",
  description: "여러 핫딜 커뮤니티에서 반응이 빠르게 늘어나는 상품을 한곳에서 확인하세요."
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
