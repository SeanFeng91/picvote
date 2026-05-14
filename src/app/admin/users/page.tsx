import Link from "next/link";

import { AdminUsersClient } from "@/components/admin-users-client";
import { LogoutButton } from "@/components/logout-button";
import { requireAdminPage } from "@/lib/guards";
import { listUsers } from "@/lib/store";

export default async function AdminUsersPage() {
  await requireAdminPage("/admin/users");
  const users = await listUsers();
  return (
    <div className="page-shell stack">
      <div className="topbar">
        <div className="brand-lockup">
          <span className="eyebrow">Admin Users</span>
          <h1 className="headline">账号与票数配置</h1>
        </div>
        <div className="row">
          <Link href="/admin" className="button-secondary">
            返回后台
          </Link>
          <LogoutButton redirectTo="/login?returnTo=%2F" />
        </div>
      </div>
      <AdminUsersClient initialUsers={users} />
    </div>
  );
}
