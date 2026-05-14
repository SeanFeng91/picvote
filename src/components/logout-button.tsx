"use client";

import { useState } from "react";
import { Button } from "antd";
import { LogoutOutlined } from "@ant-design/icons";

export function LogoutButton({ redirectTo = "/login" }: { redirectTo?: string }) {
  const [pending, setPending] = useState(false);

  async function handleLogout() {
    setPending(true);
    await fetch("/api/auth/logout", { method: "POST", credentials: "same-origin" });
    window.location.assign(redirectTo);
  }

  return (
    <Button icon={<LogoutOutlined />} onClick={handleLogout} loading={pending}>
      退出
    </Button>
  );
}
