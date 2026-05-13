import { GalleryClient } from "@/components/gallery-client";
import { LogoutButton } from "@/components/logout-button";
import { requireUserPage } from "@/lib/guards";
import { listWorks, remainingVotesForUser } from "@/lib/store";

export default function GalleryPage() {
  const user = requireUserPage("/gallery");
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
      />
    </div>
  );
}
