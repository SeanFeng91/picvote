import Link from "next/link";

import { LogoutButton } from "@/components/logout-button";
import { formatDate } from "@/lib/format";
import { requireUserPage } from "@/lib/guards";
import { getWorkForUser, listWorks, remainingVotesForUser } from "@/lib/store";

export default function HomePage() {
  const user = requireUserPage("/");
  const currentWork = getWorkForUser(user.id);
  const ranking = listWorks(false).slice(0, 5);
  const remainingVotes = remainingVotesForUser(user.id);

  return (
    <div className="page-shell stack">
      <div className="topbar">
        <div className="brand-lockup">
          <span className="eyebrow">Vivo Pic Vote</span>
          <h1 className="headline">现场投票工作台</h1>
        </div>
        <div className="row">
          {user.role === "admin" ? (
            <Link href="/admin" className="button-secondary">
              进入后台
            </Link>
          ) : null}
          <LogoutButton />
        </div>
      </div>

      <div className="layout-main">
        <div className="panel hero-panel stack">
          <div className="spread">
            <div>
              <div className="eyebrow">Welcome</div>
              <h2 style={{ margin: "6px 0 4px", fontSize: 34 }}>
                {user.displayName} · 工号 {user.employeeNo}
              </h2>
              <div className="subtle">
                上传和投票主流程已经就绪。分享页、双列瀑布流、大屏作品墙和排行榜都已接入。
              </div>
            </div>
            <span className="badge">{user.canVote ? `剩余 ${remainingVotes} 票` : "当前不可投票"}</span>
          </div>

          <div className="grid stats-grid">
            <div className="card">
              <div className="hint">我的作品</div>
              <div className="metric">{currentWork?.code ?? "--"}</div>
              <div className="subtle">{currentWork ? currentWork.title : "还未上传"}</div>
            </div>
            <div className="card">
              <div className="hint">投票权限</div>
              <div className="metric">{user.canVote ? "ON" : "OFF"}</div>
              <div className="subtle">{user.voteQuota ?? 5} 票额度</div>
            </div>
            <div className="card">
              <div className="hint">上传权限</div>
              <div className="metric">{user.canUpload ? "ON" : "OFF"}</div>
              <div className="subtle">每人仅 1 个有效作品</div>
            </div>
            <div className="card">
              <div className="hint">快捷入口</div>
              <div className="metric">GO</div>
              <div className="subtle">上传 / 相册 / 分享页</div>
            </div>
          </div>

          <div className="nav-strip">
            <Link href="/upload" className="button">
              {currentWork ? "查看或替换作品" : "上传作品"}
            </Link>
            <Link href="/gallery" className="button-secondary">
              进入相册投票
            </Link>
            <Link href="/me/votes" className="button-secondary">
              我的投票记录
            </Link>
            <Link href="/display" className="button-secondary">
              大屏展示
            </Link>
          </div>

          {currentWork ? (
            <div className="card stack">
              <div className="spread">
                <strong>我的分享页</strong>
                <Link href={currentWork.sharePath} className="button-secondary">
                  打开分享页
                </Link>
              </div>
              <div className="hint">
                你的作品编号是 {currentWork.code}，他人登录后可以通过分享页直接查看并投票。
              </div>
            </div>
          ) : null}
        </div>

        <div className="panel card stack">
          <div className="spread">
            <strong>当前前五名</strong>
            <Link href="/gallery" className="nav-chip">
              看全部
            </Link>
          </div>
          {ranking.map((work, index) => (
            <div className="card" key={work.id}>
              <div className="spread">
                <div>
                  <div className="work-code">
                    #{index + 1} · {work.code}
                  </div>
                  <div style={{ fontSize: 20, fontWeight: 700 }}>{work.title}</div>
                  <div className="work-meta">
                    工号 {work.ownerEmployeeNo} · {work.ownerDisplayName}
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 28, fontWeight: 700 }}>{work.voteCountCache}</div>
                  <div className="hint">更新于 {formatDate(work.createdAt)}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
