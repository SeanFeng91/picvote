"use client";

import { CopyOutlined, LeftOutlined, TrophyOutlined } from "@ant-design/icons";
import { App, Button, Card, InputNumber, Tag, Typography } from "antd";
import Link from "next/link";
import { useEffect, useState, useTransition } from "react";

import { Work } from "@/lib/types";
import type { Vote } from "@/lib/types";

type WorkDetailClientProps = {
  work: Work;
  remainingVotes: number;
  canVote: boolean;
  isOwner: boolean;
  activeVote?: Vote | null;
};

export function WorkDetailClient({ work, remainingVotes: startingVotes, canVote, isOwner, activeVote }: WorkDetailClientProps) {
  const { message } = App.useApp();
  const [currentWork, setCurrentWork] = useState(work);
  const [currentVote, setCurrentVote] = useState<Vote | null>(activeVote ?? null);
  const [count, setCount] = useState(1);
  const [remainingVotes, setRemainingVotes] = useState(startingVotes);
  const [pending, startVoteTransition] = useTransition();
  const [imgLoaded, setImgLoaded] = useState(false);

  // Prefetch image
  useEffect(() => {
    if (currentWork.mediaType === "image") {
      const img = new Image();
      img.src = currentWork.previewUrl;
      img.onload = () => setImgLoaded(true);
    }
  }, [currentWork.mediaType, currentWork.previewUrl]);

  async function handleVote() {
    if (!canVote || remainingVotes < count) {
      message.warning("剩余票数不足或当前账号不可投票");
      return;
    }
    startVoteTransition(async () => {
      const response = await fetch("/api/votes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workId: currentWork.id, count })
      });
      const payload = await response.json();
      if (!response.ok) {
        message.error(payload.error || "投票失败");
        return;
      }
      setCurrentWork(payload.work);
      setCurrentVote(payload.vote);
      setRemainingVotes(payload.remainingVotes);
      setCount(1);
      message.success(`成功投出 ${count} 票，剩余 ${payload.remainingVotes} 票`);
    });
  }

  async function handleRevoke() {
    if (!currentVote) return;
    startVoteTransition(async () => {
      const response = await fetch("/api/votes", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ voteId: currentVote.id })
      });
      const payload = await response.json();
      if (!response.ok) {
        message.error(payload.error || "撤回失败");
        return;
      }
      setCurrentWork(payload.work);
      setCurrentVote(null);
      setRemainingVotes(payload.remainingVotes);
      message.success(`已撤回 ${currentVote.count} 票，剩余 ${payload.remainingVotes} 票`);
    });
  }

  async function copyShareLink() {
    const shareUrl = `${window.location.origin}${currentWork.sharePath}`;
    await navigator.clipboard.writeText(shareUrl);
    message.success("分享页链接已复制");
  }

  return (
    <div className="stack">
      {/* Back Nav */}
      <Link href="/gallery" style={{ display: "inline-flex", alignItems: "center", gap: 4, color: "var(--vivo-blue)", fontSize: 14 }}>
        <LeftOutlined /> 返回相册
      </Link>

      {/* Media */}
      <Card variant="borderless" styles={{ body: { padding: 0 } }} style={{ borderRadius: 16, overflow: "hidden" }}>
        <div style={{
          background: "#0b1220",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          minHeight: 300,
          maxHeight: "60vh"
        }}>
          {currentWork.mediaType === "image" ? (
            <img
              src={currentWork.previewUrl}
              alt={currentWork.title}
              style={{
                width: "100%",
                maxHeight: "60vh",
                objectFit: "contain",
                opacity: imgLoaded ? 1 : 0,
                transition: "opacity 0.3s"
              }}
            />
          ) : (
            <video
              src={currentWork.mediaUrl}
              controls
              playsInline
              style={{ width: "100%", maxHeight: "60vh", display: "block" }}
            />
          )}
        </div>
      </Card>

      {/* Info */}
      <Card variant="borderless" style={{ borderRadius: 16 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Tags */}
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            <Tag color="blue" style={{ borderRadius: 10 }}>{currentWork.code}</Tag>
            <Tag style={{ borderRadius: 10 }}>{currentWork.mediaType === "video" ? "视频" : "图片"}</Tag>
            {isOwner ? <Tag color="green" style={{ borderRadius: 10 }}>我的作品</Tag> : null}
          </div>

          {/* Title */}
          <Typography.Title level={3} style={{ margin: 0 }}>
            {currentWork.title}
          </Typography.Title>

          {/* Stats */}
          <div className="stats-strip">
            <div className="stat-chip accent">
              当前 <strong>{currentWork.voteCountCache}</strong> 票
            </div>
            <div className="stat-chip">
              我剩余 <strong>{remainingVotes}</strong> 票
            </div>
          </div>

          {/* Vote Controls */}
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <Typography.Text strong style={{ fontSize: 14 }}>投票数量</Typography.Text>
              <InputNumber
                min={1}
                max={Math.max(1, remainingVotes)}
                value={count}
                onChange={(value) => setCount(Number(value || 1))}
                disabled={!canVote || remainingVotes < 1}
                style={{ width: 120 }}
                addonAfter="票"
              />
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <Button
                type={currentVote ? "default" : "primary"}
                icon={<TrophyOutlined />}
                loading={pending}
                disabled={!canVote || (!currentVote && remainingVotes < 1)}
                onClick={currentVote ? handleRevoke : handleVote}
                style={{ flex: 1, height: 44, borderRadius: 22, fontWeight: 600 }}
              >
                {currentVote ? `撤回 ${currentVote.count} 票` : "确认投票"}
              </Button>
              <Button
                icon={<CopyOutlined />}
                onClick={copyShareLink}
                style={{ height: 44, borderRadius: 22 }}
              >
                复制分享链接
              </Button>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
