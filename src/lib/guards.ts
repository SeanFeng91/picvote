import { redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/auth";

export function requireUserPage(returnTo: string) {
  const user = getCurrentUser();
  if (!user) {
    redirect(`/login?returnTo=${encodeURIComponent(returnTo)}`);
  }
  return user;
}

export function requireAdminPage(returnTo: string) {
  const user = getCurrentUser();
  if (!user) {
    redirect(`/admin/login?returnTo=${encodeURIComponent(returnTo)}`);
  }
  if (user.role !== "admin") {
    redirect("/");
  }
  return user;
}
