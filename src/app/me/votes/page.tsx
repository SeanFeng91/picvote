import Link from "next/link";

import { LogoutButton } from "@/components/logout-button";
import { formatDate } from "@/lib/format";
import { requireUserPage } from "@/lib/guards";
import { listVotesForUser } from "@/lib/store";

export default async function MyVotesPage() {
  const user = await requireUserPage("/me/votes");
  const votes = listVotesForUser(user.id);

  return (
    <div className="page-shell stack">
      <div className="topbar">
        <div className="brand-lockup">
          <span className="eyebrow">My Votes</span>
          <h1 className="headline">我的投票记录</h1>
        </div>
        <LogoutButton />
      </div>
      <div className="panel card stack">
        <div className="nav-strip">
          <Link href="/" className="nav-chip">
            返回首页
          </Link>
          <Link href="/gallery" className="nav-chip">
            回到相册
          </Link>
        </div>
        <table className="table">
          <thead>
            <tr>
              <th>时间</th>
              <th>作品编号</th>
              <th>票数</th>
              <th>状态</th>
            </tr>
          </thead>
          <tbody>
            {votes.map((vote) => (
              <tr key={vote.id}>
                <td>{formatDate(vote.createdAt)}</td>
                <td>{vote.workCode}</td>
                <td>{vote.count}</td>
                <td>{vote.status === "valid" ? "有效" : `作废 · ${vote.reason}`}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
