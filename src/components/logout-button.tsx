"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "antd";
import { LogoutOutlined } from "@ant-design/icons";

export function LogoutButton({ redirectTo = "/login" }: { redirectTo?: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function handleLogout() {
    setPending(true);
    await fetch("/api/auth/logout", { method: "POST" });
    router.push(redirectTo);
    router.refresh();
  }

  return (
    <Button icon={<LogoutOutlined />} onClick={handleLogout} loading={pending}>
      退出
    </Button>
  );
}
