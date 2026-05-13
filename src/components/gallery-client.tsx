"use client";

import Link from "next/link";
import { startTransition, useDeferredValue, useEffect, useMemo, useState, useTransition } from "react";

import { Work } from "@/lib/types";

type GalleryClientProps = {
  initialWorks: Work[];
  initialRemainingVotes: number;
  canVote: boolean;
};

export function GalleryClient({ initialWorks, initialRemainingVotes, canVote }: GalleryClientProps) {
  const [works, setWorks] = useState(initialWorks);
  const [remainingVotes, setRemainingVotes] = useState(initialRemainingVotes);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "image" | "video">("all");
  const [message, setMessage] = useState("");
  const [pending, startVoteTransition] = useTransition();
  const deferredSearch = useDeferredValue(search);

  useEffect(() => {
    const timer = window.setInterval(async () => {
      const response = await fetch("/api/works", { cache: "no-store" });
      if (!response.ok) {
        return;
      }
      const payload = await response.json();
      startTransition(() => {
        setWorks(payload.works);
        if (typeof payload.remainingVotes === "number") {
          setRemainingVotes(payload.remainingVotes);
        }
      });
    }, 10000);
    return () => window.clearInterval(timer);
  }, []);

  const filteredWorks = useMemo(() => {
    return works.filter((work) => {
      const matchesSearch =
        !deferredSearch ||
        `${work.code} ${work.title} ${work.ownerEmployeeNo} ${work.ownerDisplayName}`
          .toLowerCase()
          .includes(deferredSearch.toLowerCase());
      const matchesFilter = filter === "all" || work.mediaType === filter;
      return matchesSearch && matchesFilter;
    });
  }, [deferredSearch, filter, works]);

  async function quickVote(workId: string) {
    if (!canVote || remainingVotes < 1) {
      return;
    }
    startVoteTransition(async () => {
      setMessage("");
      const response = await fetch("/api/votes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workId, count: 1 })
      });
      const payload = await response.json();
      if (!response.ok) {
        setMessage(payload.error || "投票失败");
        return;
      }
      setRemainingVotes(payload.remainingVotes);
      setWorks((current) =>
        current.map((work) => (work.id === payload.work.id ? { ...work, voteCountCache: payload.work.voteCountCache } : work))
      );
      setMessage(`已投出 1 票，剩余 ${payload.remainingVotes} 票`);
    });
  }

  return (
    <div className="stack">
      <div className="panel card stack">
        <div className="spread">
          <div className="stack" style={{ gap: 8 }}>
            <strong>相册与投票</strong>
            <span className="hint">按编号、标题、上传人工号搜索。手机端默认双列瀑布流。</span>
          </div>
          <span className="badge">剩余 {remainingVotes} 票</span>
        </div>
        <div className="row">
          <input
            className="input"
            placeholder="搜索编号 / 标题 / 工号"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
          <select className="select" value={filter} onChange={(event) => setFilter(event.target.value as typeof filter)}>
            <option value="all">全部</option>
            <option value="image">图片</option>
            <option value="video">视频</option>
          </select>
        </div>
        <div className="nav-strip">
          <Link href="/" className="nav-chip">
            返回首页
          </Link>
          <Link href="/upload" className="nav-chip">
            上传作品
          </Link>
          <Link href="/me/votes" className="nav-chip">
            我的投票
          </Link>
        </div>
        {message ? <div className="success">{message}</div> : null}
      </div>

      <div className="masonry">
        {filteredWorks.map((work) => (
          <div className="masonry-card" key={work.id}>
            <div className="work-card">
              <Link href={`/works/${work.code}`}>
                {work.mediaType === "image" ? (
                  <img className="work-media" src={work.previewUrl} alt={work.title} />
                ) : (
                  <video className="work-media" src={work.mediaUrl} muted playsInline />
                )}
              </Link>
              <div className="work-body stack">
                <div className="spread">
                  <span className="work-code">{work.code}</span>
                  <span className="badge">{work.voteCountCache} 票</span>
                </div>
                <div>
                  <div className="work-title">{work.title}</div>
                  <div className="work-meta">
                    上传人工号 {work.ownerEmployeeNo} · {work.ownerDisplayName}
                  </div>
                </div>
                <div className="row">
                  <button className="button" onClick={() => quickVote(work.id)} disabled={!canVote || remainingVotes < 1 || pending}>
                    {pending ? "提交中..." : "投 1 票"}
                  </button>
                  <Link href={`/share/${work.code}`} className="button-secondary">
                    分享页
                  </Link>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
