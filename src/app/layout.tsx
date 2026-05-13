import type { Metadata } from "next";

import "./globals.css";

export const metadata: Metadata = {
  title: "Vivo Pic Vote",
  description: "百人级图片视频投票系统"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
