import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "NOSYU — 충남 하이퍼로컬 관광",
  description: "공공데이터와 AI로 충남의 숨은 체험을 발굴합니다.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <body className="min-h-screen bg-white text-neutral-900 antialiased">
        {children}
      </body>
    </html>
  );
}
