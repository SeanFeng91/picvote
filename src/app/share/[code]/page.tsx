import Link from "next/link";
import { notFound } from "next/navigation";

import { LogoutButton } from "@/components/logout-button";
import { WorkDetailClient } from "@/components/work-detail-client";
import { requireUserPage } from "@/lib/guards";
import { getWorkByCode, remainingVotesForUser } from "@/lib/store";

export default function SharePage({ params }: { params: { code: string } }) {
  const user = requireUserPage(`/share/${params.code}`);
  const work = getWorkByCode(params.code);
  if (!work || work.status !== "active") {
    notFound();
  }

  return (
    <div className="page-shell stack">
      <div className="topbar">
        <div className="brand-lockup">
          <span className="eyebrow">Share Page</span>
          <h1 className="headline">作品分享页</h1>
        </div>
        <div className="row">
          <Link href={`/works/${work.code}`} className="button-secondary">
            进入标准详情页
          </Link>
          <LogoutButton />
        </div>
      </div>
      <div className="panel card">
        <div className="hint">分享页用于传播作品链接。其他有权限的员工登录后，可以直接查看并投票。</div>
      </div>
      <WorkDetailClient
        work={work}
        remainingVotes={remainingVotesForUser(user.id)}
        canVote={user.canVote}
        isOwner={user.id === work.ownerUserId}
      />
    </div>
  );
}
