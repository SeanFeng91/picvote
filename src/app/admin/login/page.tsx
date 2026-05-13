import { redirect } from "next/navigation";

import { LoginForm } from "@/components/login-form";
import { getCurrentUser } from "@/lib/auth";

export default async function AdminLoginPage({
  searchParams
}: {
  searchParams: Promise<{ returnTo?: string }>;
}) {
  const params = await searchParams;
  const user = await getCurrentUser();
  if (user?.role === "admin") {
    redirect(params.returnTo || "/admin");
  }
  return (
    <LoginForm
      title="管理员登录"
      subtitle="进入账号配置、实时排名、作品管理和大屏展示控制。"
      intent="admin"
      returnTo={params.returnTo}
    />
  );
}
