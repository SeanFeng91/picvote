"use client";

import { LockOutlined, NumberOutlined } from "@ant-design/icons";
import { Alert, Button, Card, Form, Input, Space, Typography } from "antd";
import { useRouter } from "next/navigation";
import { useState } from "react";

type LoginFormProps = {
  title: string;
  subtitle: string;
  intent?: "user" | "admin";
  returnTo?: string;
};

export function LoginForm({ title, subtitle, intent = "user", returnTo }: LoginFormProps) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);

  async function handleSubmit(values: { employeeNo: string; accessCode: string }) {
    setPending(true);
    setMessage("");

    const response = await fetch("/api/auth/login", {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...values, intent, returnTo })
    });

    const payload = await response.json();
    setPending(false);
    if (!response.ok) {
      setMessage(payload.error || "登录失败");
      return;
    }

    router.push(payload.redirectTo);
    router.refresh();
  }

  return (
    <div className="page-shell" style={{ maxWidth: 440 }}>
      <Card bordered={false}>
        <Space direction="vertical" size={16} style={{ width: "100%" }}>
          <div>
            <Typography.Text type="secondary">Vivo Pic Vote</Typography.Text>
            <Typography.Title level={2} style={{ margin: "4px 0" }}>
              {title}
            </Typography.Title>
            <Typography.Paragraph type="secondary" style={{ margin: 0 }}>
              {subtitle}
            </Typography.Paragraph>
          </div>
          <Form layout="vertical" onFinish={handleSubmit}>
            <Form.Item name="employeeNo" label="工号" rules={[{ required: true, message: "请输入工号" }]}>
              <Input inputMode="numeric" prefix={<NumberOutlined />} placeholder="请输入活动工号" autoComplete="username" />
            </Form.Item>
            <Form.Item name="accessCode" label="登录口令" rules={[{ required: true, message: "请输入口令" }]}>
              <Input.Password prefix={<LockOutlined />} placeholder="请输入登录口令" autoComplete="current-password" />
            </Form.Item>
            <Button type="primary" htmlType="submit" block loading={pending}>
              进入系统
            </Button>
          </Form>
          {message ? <Alert type="error" showIcon message={message} /> : null}
        </Space>
      </Card>
    </div>
  );
}
