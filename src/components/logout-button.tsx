"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

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
    <button className="button-secondary" onClick={handleLogout} disabled={pending}>
      {pending ? "退出中..." : "退出"}
    </button>
  );
}
