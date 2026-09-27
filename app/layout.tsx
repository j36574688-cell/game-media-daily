import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Game Media Daily · Editorial OS",
  description: "遊戲新聞聚合、來源資料庫、翻譯、Threads 草稿與 Claim 審核工作台",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-Hant" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
