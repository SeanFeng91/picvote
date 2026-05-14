import { GalleryClient } from "@/components/gallery-client";
import { LogoutButton } from "@/components/logout-button";
import { requireUserPage } from "@/lib/guards";
import { getWorkForUser, listVotesForUser, listWorks, remainingVotesForUser } from "@/lib/store";

export default async function GalleryPage() {
  const user = await requireUserPage("/gallery");
  const [votes, works, remainingVotes, currentWork] = await Promise.all([
    listVotesForUser(user.id),
    listWorks(false),
    remainingVotesForUser(user.id),
    getWorkForUser(user.id)
  ]);
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
        initialWorks={works}
        initialRemainingVotes={remainingVotes}
        canVote={user.canVote}
        currentWork={currentWork}
        initialVotes={votes}
      />
    </div>
  );
}
