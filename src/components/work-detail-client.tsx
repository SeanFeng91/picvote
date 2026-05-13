"use client";

import { useState, useTransition } from "react";

import { Work } from "@/lib/types";
import { VoteStepper } from "@/components/vote-stepper";

type WorkDetailClientProps = {
  work: Work;
  remainingVotes: number;
  canVote: boolean;
  isOwner: boolean;
};

export function WorkDetailClient({ work, remainingVotes: startingVotes, canVote, isOwner }: WorkDetailClientProps) {
  const [currentWork, setCurrentWork] = useState(work);
  const [count, setCount] = useState(1);
  const [remainingVotes, setRemainingVotes] = useState(startingVotes);
  const [message, setMessage] = useState("");
  const [pending, startVoteTransition] = useTransition();

  async function handleVote() {
    if (!canVote) {
      return;
    }
    startVoteTransition(async () => {
      setMessage("");
      const response = await fetch("/api/votes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workId: currentWork.id, count })
      });
      const payload = await response.json();
      if (!response.ok) {
        setMessage(payload.error || "投票失败");
        return;
      }
      setCurrentWork(payload.work);
      setRemainingVotes(payload.remainingVotes);
      setCount(1);
      setMessage(`成功投出 ${count} 票，剩余 ${payload.remainingVotes} 票`);
    });
  }

  async function copyShareLink() {
    const shareUrl = `${window.location.origin}${currentWork.sharePath}`;
    await navigator.clipboard.writeText(shareUrl);
    setMessage("分享页链接已复制");
  }

  return (
    <div className="layout-main">
      <div className="panel stack hero-panel">
        {currentWork.mediaType === "image" ? (
          <img className="work-media" src={currentWork.previewUrl} alt={currentWork.title} />
        ) : (
          <video className="work-media" src={currentWork.mediaUrl} controls playsInline />
        )}
      </div>
      <div className="panel stack hero-panel">
        <div className="work-code">{currentWork.code}</div>
        <h1 style={{ margin: 0, fontSize: "clamp(28px, 4vw, 42px)" }}>{currentWork.title}</h1>
        <div className="subtle">上传人工号 {currentWork.ownerEmployeeNo} · {currentWork.ownerDisplayName}</div>
        <div className="grid stats-grid">
          <div className="card">
            <div className="hint">当前票数</div>
            <div className="metric">{currentWork.voteCountCache}</div>
          </div>
          <div className="card">
            <div className="hint">剩余票数</div>
            <div className="metric">{remainingVotes}</div>
          </div>
        </div>
        <div className="stack">
          <strong>投票</strong>
          <VoteStepper value={count} max={Math.max(1, remainingVotes)} onChange={setCount} />
          <button className="button" onClick={handleVote} disabled={!canVote || remainingVotes < 1 || pending}>
            {pending ? "投票中..." : `确认投 ${count} 票`}
          </button>
          <div className="hint">默认 1 票，可通过上下箭头调整票数。</div>
        </div>
        <div className="row">
          <button className="button-secondary" type="button" onClick={copyShareLink}>
            复制分享页链接
          </button>
          {isOwner ? <span className="badge">这是你的作品</span> : null}
        </div>
        {message ? <div className="success">{message}</div> : null}
      </div>
    </div>
  );
}
