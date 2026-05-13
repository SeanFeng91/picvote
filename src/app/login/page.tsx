import { redirect } from "next/navigation";

import { LoginForm } from "@/components/login-form";
import { getCurrentUser } from "@/lib/auth";

export default function LoginPage({
  searchParams
}: {
  searchParams: { returnTo?: string };
}) {
  const user = getCurrentUser();
  if (user) {
    redirect(searchParams.returnTo || "/");
  }
  return (
    <LoginForm
      title="参与者登录"
      subtitle="用工号和登录口令进入上传、相册、投票和分享页。"
      intent="user"
      returnTo={searchParams.returnTo}
    />
  );
}
