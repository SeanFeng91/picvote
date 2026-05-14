import Link from "next/link";

import { AdminDashboardClient } from "@/components/admin-dashboard-client";
import { LogoutButton } from "@/components/logout-button";
import { requireAdminPage } from "@/lib/guards";
import { getAdminSummary } from "@/lib/store";

export default async function AdminPage() {
  await requireAdminPage("/admin");
  const summary = await getAdminSummary();

  return (
    <div className="page-shell stack">
      <div className="topbar">
        <div className="brand-lockup">
          <span className="eyebrow">Admin Console</span>
          <h1 className="headline">后台总览</h1>
        </div>
        <div className="row">
          <Link href="/" className="button-secondary">
            用户端
          </Link>
          <Link href="/display" className="button-secondary">
            展示页
          </Link>
          <LogoutButton redirectTo="/login?returnTo=%2F" />
        </div>
      </div>
      <AdminDashboardClient summary={summary} />
    </div>
  );
}
