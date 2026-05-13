import Link from "next/link";

import { AdminVotesClient } from "@/components/admin-votes-client";
import { LogoutButton } from "@/components/logout-button";
import { requireAdminPage } from "@/lib/guards";
import { listVotes } from "@/lib/store";

export default async function AdminVotesPage() {
  await requireAdminPage("/admin/votes");
  return (
    <div className="page-shell stack">
      <div className="topbar">
        <div className="brand-lockup">
          <span className="eyebrow">Admin Votes</span>
          <h1 className="headline">投票记录与异常排查</h1>
        </div>
        <div className="row">
          <Link href="/admin" className="button-secondary">
            返回后台
          </Link>
          <LogoutButton redirectTo="/admin/login" />
        </div>
      </div>
      <AdminVotesClient initialVotes={listVotes()} />
    </div>
  );
}
