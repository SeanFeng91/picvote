"use client";

import { LockOutlined, NumberOutlined } from "@ant-design/icons";
import { Alert, Button, Card, Form, Input, Typography } from "antd";
import { useState } from "react";

type LoginFormProps = {
  title: string;
  subtitle: string;
  intent?: "user" | "admin";
  returnTo?: string;
};

export function LoginForm({ title, subtitle, intent = "user", returnTo }: LoginFormProps) {
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);

  async function handleSubmit(values: { employeeNo: string; accessCode: string }) {
    setPending(true);
    setMessage("");

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...values, intent, returnTo })
      });

      const payload = await response.json();
      if (!response.ok) {
        setPending(false);
        setMessage(payload.error || "登录失败");
        return;
      }

      // Use href assignment for maximum mobile browser compatibility
      // Keep pending=true to show loading state during navigation
      window.location.href = payload.redirectTo;
    } catch {
      setPending(false);
      setMessage("网络异常，请重试");
    }
  }

  return (
    <div className="page-shell" style={{ maxWidth: 440, paddingTop: 60 }}>
      <Card variant="borderless" style={{ borderRadius: 20, boxShadow: "0 8px 32px rgba(0,0,0,0.08)" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ textAlign: "center", marginBottom: 8 }}>
            <div style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              width: 56,
              height: 56,
              borderRadius: 16,
              background: "linear-gradient(135deg, #415FFF, #6B82FF)",
              marginBottom: 16
            }}>
              <span style={{ fontSize: 28, color: "#fff" }}>📷</span>
            </div>
            <Typography.Title level={3} style={{ margin: "0 0 4px" }}>
              {title}
            </Typography.Title>
            <Typography.Paragraph type="secondary" style={{ margin: 0, fontSize: 14 }}>
              {subtitle}
            </Typography.Paragraph>
          </div>
          <Form layout="vertical" onFinish={handleSubmit} size="large">
            <Form.Item name="employeeNo" label="工号" rules={[{ required: true, message: "请输入工号" }]}>
              <Input inputMode="numeric" prefix={<NumberOutlined />} placeholder="请输入活动工号" autoComplete="username" />
            </Form.Item>
            <Form.Item name="accessCode" label="登录口令" rules={[{ required: true, message: "请输入口令" }]}>
              <Input.Password prefix={<LockOutlined />} placeholder="请输入登录口令" autoComplete="current-password" />
            </Form.Item>
            <Button type="primary" htmlType="submit" block loading={pending} size="large" style={{ height: 48, borderRadius: 24, fontWeight: 600 }}>
              进入系统
            </Button>
          </Form>
          {message ? <Alert type="error" showIcon message={message} /> : null}
        </div>
      </Card>
    </div>
  );
}
