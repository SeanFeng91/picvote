import { redirect } from "next/navigation";

import { LoginForm } from "@/components/login-form";
import { getCurrentUser } from "@/lib/auth";

export default function AdminLoginPage({
  searchParams
}: {
  searchParams: { returnTo?: string };
}) {
  const user = getCurrentUser();
  if (user?.role === "admin") {
    redirect(searchParams.returnTo || "/admin");
  }
  return (
    <LoginForm
      title="管理员登录"
      subtitle="进入账号配置、实时排名、作品管理和大屏展示控制。"
      intent="admin"
      returnTo={searchParams.returnTo}
    />
  );
}
