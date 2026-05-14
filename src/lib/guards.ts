import { redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/auth";

export async function requireUserPage(returnTo: string) {
  const user = await getCurrentUser();
  if (!user) {
    redirect(`/login?returnTo=${encodeURIComponent(returnTo)}`);
  }
  return user;
}

export async function requireAdminPage(returnTo: string) {
  const user = await getCurrentUser();
  if (!user) {
    redirect(`/login?returnTo=${encodeURIComponent(returnTo)}`);
  }
  if (user.role !== "admin") {
    redirect("/");
  }
  return user;
}
