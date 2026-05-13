import Link from "next/link";

import { LogoutButton } from "@/components/logout-button";
import { requireAdminPage } from "@/lib/guards";
import { getAdminSummary } from "@/lib/store";

export default function AdminPage() {
  requireAdminPage("/admin");
  const summary = getAdminSummary();

  return (
    <div className="page-shell stack">
      <div className="topbar">
        <div className="brand-lockup">
          <span className="eyebrow">Admin</span>
          <h1 className="headline">后台总览</h1>
        </div>
        <div className="row">
          <Link href="/display" className="button-secondary">
            打开展示页
          </Link>
          <LogoutButton redirectTo="/admin/login" />
        </div>
      </div>

      <div className="grid stats-grid">
        <div className="panel card">
          <div className="hint">活动状态</div>
          <div className="metric">{summary.activity.status}</div>
        </div>
        <div className="panel card">
          <div className="hint">有效作品</div>
          <div className="metric">{summary.worksCount}</div>
        </div>
        <div className="panel card">
          <div className="hint">有效投票总数</div>
          <div className="metric">{summary.totalVotes}</div>
        </div>
        <div className="panel card">
          <div className="hint">参与投票人数</div>
          <div className="metric">{summary.votersCount}</div>
        </div>
      </div>

      <div className="layout-main">
        <div className="panel hero-panel stack">
          <div className="nav-strip">
            <Link href="/admin/users" className="button">
              账号配置
            </Link>
            <Link href="/admin/works" className="button-secondary">
              作品管理
            </Link>
            <Link href="/display" className="button-secondary">
              作品墙
            </Link>
            <Link href="/display?mode=ranking" className="button-secondary">
              排行榜
            </Link>
          </div>
          <div className="card stack">
            <strong>当前能力</strong>
            <div className="hint">
              已支持管理员人工删除他人作品、调整上传/投票权限和票数额度、查看前五排名与实时展示页。
            </div>
          </div>
        </div>

        <div className="panel card stack">
          <strong>当前前五</strong>
          {summary.ranking.map((work: (typeof summary.ranking)[number], index: number) => (
            <div className="card" key={work.id}>
              <div className="spread">
                <div>
                  <div className="work-code">
                    #{index + 1} · {work.code}
                  </div>
                  <div style={{ fontSize: 18, fontWeight: 700 }}>{work.title}</div>
                  <div className="work-meta">工号 {work.ownerEmployeeNo}</div>
                </div>
                <strong>{work.voteCountCache} 票</strong>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
