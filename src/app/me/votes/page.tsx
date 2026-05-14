import { LogoutButton } from "@/components/logout-button";
import { MyVotesClient } from "@/components/my-votes-client";
import { requireUserPage } from "@/lib/guards";
import { listVotesForUser } from "@/lib/store";

export default async function MyVotesPage() {
  const user = await requireUserPage("/me/votes");
  const votes = await listVotesForUser(user.id);

  return (
    <div className="page-shell stack">
      <div className="topbar">
        <div className="brand-lockup">
          <span className="eyebrow">My Votes</span>
          <h1 className="headline">我的投票记录</h1>
        </div>
        <LogoutButton />
      </div>
      <MyVotesClient initialVotes={votes} />
    </div>
  );
}
