import Link from "next/link";

import { GalleryClient } from "@/components/gallery-client";
import { LogoutButton } from "@/components/logout-button";
import { requireUserPage } from "@/lib/guards";
import { getActivity, getWorkForUser, listVotesForUser, listWorks, remainingVotesForUser } from "@/lib/store";

export default async function HomePage() {
  const user = await requireUserPage("/");
  const activity = getActivity();
  const currentWork = getWorkForUser(user.id);
  const votes = listVotesForUser(user.id);

  return (
    <div className="page-shell stack">
      <div className="topbar">
        <div className="brand-lockup">
          <span className="eyebrow">Vivo Pic Vote · {activity.name}</span>
          <h1 className="headline">相册投票工作台</h1>
        </div>
        <div className="row">
          <span className={`status-pill ${activity.status === "voting" ? "is-live" : ""}`}>{activity.status}</span>
          {user.role === "admin" ? (
            <Link href="/admin" className="button-secondary">
              后台
            </Link>
          ) : null}
          <LogoutButton />
        </div>
      </div>
      <GalleryClient
        compactHome
        initialWorks={listWorks(false)}
        initialRemainingVotes={remainingVotesForUser(user.id)}
        canVote={user.canVote}
        currentWork={currentWork}
        votedWorkIds={votes.filter((vote) => vote.status === "valid").map((vote) => vote.workId)}
      />
    </div>
  );
}
