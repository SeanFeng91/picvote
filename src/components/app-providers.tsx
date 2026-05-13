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
          colorPrimary: "#1677ff",
          colorSuccess: "#16a34a",
          colorWarning: "#d97706",
          colorError: "#dc2626",
          colorText: "#111827",
          colorTextSecondary: "#5b6472",
          colorBgLayout: "#f5f7fb",
          borderRadius: 8,
          wireframe: false,
          fontFamily:
            "Alibaba PuHuiTi, MiSans, PingFang SC, Noto Sans SC, Microsoft YaHei, system-ui, sans-serif"
        },
        components: {
          Button: {
            controlHeight: 36,
            borderRadius: 8
          },
          Card: {
            borderRadiusLG: 8,
            paddingLG: 16
          },
          Table: {
            cellPaddingBlock: 8,
            cellPaddingInline: 10,
            headerBg: "#f8fafc"
          },
          Input: {
            controlHeight: 38
          },
          Select: {
            controlHeight: 38
          },
          Statistic: {
            titleFontSize: 12,
            contentFontSize: 28
          }
        }
      }}
    >
      <App>{children}</App>
    </ConfigProvider>
  );
}
