import Link from "next/link";
import { notFound } from "next/navigation";

import { LogoutButton } from "@/components/logout-button";
import { WorkDetailClient } from "@/components/work-detail-client";
import { requireUserPage } from "@/lib/guards";
import { getWorkByCode, remainingVotesForUser } from "@/lib/store";

export default async function WorkDetailPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const user = await requireUserPage(`/works/${code}`);
  const work = getWorkByCode(code);
  if (!work || work.status !== "active") {
    notFound();
  }

  return (
    <div className="page-shell stack">
      <div className="topbar">
        <div className="brand-lockup">
          <span className="eyebrow">Work Detail</span>
          <h1 className="headline">作品详情</h1>
        </div>
        <div className="row">
          <Link href="/gallery" className="button-secondary">
            返回相册
          </Link>
          <LogoutButton />
        </div>
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
