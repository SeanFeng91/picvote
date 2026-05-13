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
      title="参与者登录"
      subtitle="用工号和登录口令进入上传、相册、投票和分享页。"
      intent="user"
      returnTo={params.returnTo}
    />
  );
}
