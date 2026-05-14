"use client";

import { App, ConfigProvider, theme } from "antd";
import zhCN from "antd/locale/zh_CN";

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <ConfigProvider
      locale={zhCN}
      theme={{
        algorithm: theme.compactAlgorithm,
        token: {
          colorPrimary: "#415FFF",
          colorSuccess: "#00B578",
          colorWarning: "#FF8F1F",
          colorError: "#FA2C19",
          colorInfo: "#415FFF",
          colorText: "#1A1A1A",
          colorTextSecondary: "#7C7C7C",
          colorBgLayout: "#F5F6FA",
          borderRadius: 12,
          wireframe: false,
          fontFamily:
            '-apple-system, BlinkMacSystemFont, "PingFang SC", "Noto Sans SC", "Microsoft YaHei", system-ui, sans-serif',
          controlHeight: 40
        },
        components: {
          Button: {
            controlHeight: 40,
            borderRadius: 20,
            primaryShadow: "0 2px 8px rgba(65,95,255,0.3)"
          },
          Card: {
            borderRadiusLG: 16,
            paddingLG: 16
          },
          Table: {
            cellPaddingBlock: 8,
            cellPaddingInline: 10,
            headerBg: "#F5F6FA"
          },
          Input: {
            controlHeight: 40,
            borderRadius: 20
          },
          Select: {
            controlHeight: 40,
            borderRadius: 12
          },
          Segmented: {
            borderRadius: 20,
            itemSelectedBg: "#415FFF",
            itemSelectedColor: "#FFFFFF"
          },
          Tag: {
            borderRadiusSM: 10
          },
          Badge: {
            dotSize: 8
          },
          Statistic: {
            titleFontSize: 11,
            contentFontSize: 22
          }
        }
      }}
    >
      <App>{children}</App>
    </ConfigProvider>
  );
}
