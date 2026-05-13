import { GalleryClient } from "@/components/gallery-client";
import { LogoutButton } from "@/components/logout-button";
import { requireUserPage } from "@/lib/guards";
import { getWorkForUser, listVotesForUser, listWorks, remainingVotesForUser } from "@/lib/store";

export default async function GalleryPage() {
  const user = await requireUserPage("/gallery");
  const votes = listVotesForUser(user.id);
  return (
    <div className="page-shell stack">
      <div className="topbar">
        <div className="brand-lockup">
          <span className="eyebrow">Gallery</span>
          <h1 className="headline">作品相册</h1>
        </div>
        <LogoutButton />
      </div>
      <GalleryClient
        initialWorks={listWorks(false)}
        initialRemainingVotes={remainingVotesForUser(user.id)}
        canVote={user.canVote}
        currentWork={getWorkForUser(user.id)}
        votedWorkIds={votes.filter((vote) => vote.status === "valid").map((vote) => vote.workId)}
      />
    </div>
  );
}
