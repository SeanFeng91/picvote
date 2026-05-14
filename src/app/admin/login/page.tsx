import { redirect } from "next/navigation";

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
  redirect(`/login?returnTo=${encodeURIComponent(params.returnTo || "/admin")}`);
}
