import Link from "next/link";

import { AdminWorksClient } from "@/components/admin-works-client";
import { LogoutButton } from "@/components/logout-button";
import { requireAdminPage } from "@/lib/guards";
import { listAllWorks } from "@/lib/store";

export default function AdminWorksPage() {
  requireAdminPage("/admin/works");
  return (
    <div className="page-shell stack">
      <div className="topbar">
        <div className="brand-lockup">
          <span className="eyebrow">Admin Works</span>
          <h1 className="headline">作品管理</h1>
        </div>
        <div className="row">
          <Link href="/admin" className="button-secondary">
            返回后台
          </Link>
          <LogoutButton redirectTo="/admin/login" />
        </div>
      </div>
      <AdminWorksClient initialWorks={listAllWorks()} />
    </div>
  );
}
