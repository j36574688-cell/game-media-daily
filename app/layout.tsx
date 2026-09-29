import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Game Media Daily · Editorial OS",
  description: "遊戲新聞聚合、RSS / Atom 監控、翻譯、Threads 草稿與 Claim 審核工作台",
  openGraph: {
    title: "Game Media Daily · Editorial OS",
    description: "遊戲新聞聚合、來源健康度、翻譯、Threads 草稿與 Claim 審核工作台",
    type: "website"
  }
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="zh-Hant" suppressHydrationWarning><body>{children}</body></html>;
}
