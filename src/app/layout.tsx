import type { Metadata } from "next";
import { AntdRegistry } from "@ant-design/nextjs-registry";

import { AppProviders } from "@/components/app-providers";
import "antd/dist/reset.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "Vivo Pic Vote",
  description: "百人级图片视频投票系统"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body>
        <AntdRegistry>
          <AppProviders>{children}</AppProviders>
        </AntdRegistry>
      </body>
    </html>
  );
}
