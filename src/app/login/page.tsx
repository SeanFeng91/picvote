import { redirect } from "next/navigation";

import { LoginForm } from "@/components/login-form";
import { getCurrentUser } from "@/lib/auth";

export default async function LoginPage({
  searchParams
}: {
  searchParams: Promise<{ returnTo?: string }>;
}) {
  const params = await searchParams;
  const user = await getCurrentUser();
  if (user) {
    redirect(params.returnTo || "/");
  }
  return (
    <LoginForm
      title="统一登录"
      subtitle="用工号和登录口令进入系统；管理员登录后会进入后台，参与者进入相册。"
      intent="user"
      returnTo={params.returnTo}
    />
  );
}
