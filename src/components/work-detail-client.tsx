"use client";

import { CopyOutlined, TrophyOutlined } from "@ant-design/icons";
import { App, Button, Card, Image, InputNumber, Space, Statistic, Tag, Typography } from "antd";
import { useState, useTransition } from "react";

import { Work } from "@/lib/types";

type WorkDetailClientProps = {
  work: Work;
  remainingVotes: number;
  canVote: boolean;
  isOwner: boolean;
};

export function WorkDetailClient({ work, remainingVotes: startingVotes, canVote, isOwner }: WorkDetailClientProps) {
  const { message } = App.useApp();
  const [currentWork, setCurrentWork] = useState(work);
  const [count, setCount] = useState(1);
  const [remainingVotes, setRemainingVotes] = useState(startingVotes);
  const [pending, startVoteTransition] = useTransition();

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
      setRemainingVotes(payload.remainingVotes);
      setCount(1);
      message.success(`成功投出 ${count} 票，剩余 ${payload.remainingVotes} 票`);
    });
  }

  async function copyShareLink() {
    const shareUrl = `${window.location.origin}${currentWork.sharePath}`;
    await navigator.clipboard.writeText(shareUrl);
    message.success("分享页链接已复制");
  }

  return (
    <div className="photo-workbench">
      <Card styles={{ body: { padding: 0 } }}>
        <div className="detail-media-shell">
          {currentWork.mediaType === "image" ? (
            <Image
              src={currentWork.previewUrl}
              alt={currentWork.title}
              style={{ width: "100%", maxHeight: "min(76vh, 760px)", objectFit: "contain" }}
            />
          ) : (
            <video className="detail-media" src={currentWork.mediaUrl} controls playsInline />
          )}
        </div>
      </Card>
      <Card>
        <Space direction="vertical" size={16} style={{ width: "100%" }}>
          <Space wrap>
            <Tag color="blue">{currentWork.code}</Tag>
            <Tag>{currentWork.mediaType === "video" ? "视频" : "图片"}</Tag>
            {isOwner ? <Tag color="green">我的作品</Tag> : null}
          </Space>
          <div>
            <Typography.Title level={2} style={{ margin: 0 }}>
              {currentWork.title}
            </Typography.Title>
          </div>
          <div className="stats-grid" style={{ gridTemplateColumns: "1fr 1fr" }}>
            <Card size="small">
              <Statistic title="当前票数" value={currentWork.voteCountCache} suffix="票" />
            </Card>
            <Card size="small">
              <Statistic title="我的剩余" value={remainingVotes} suffix="票" />
            </Card>
          </div>
          <Space direction="vertical" size={8}>
            <Typography.Text strong>投票数量</Typography.Text>
            <InputNumber
              min={1}
              max={Math.max(1, remainingVotes)}
              value={count}
              onChange={(value) => setCount(Number(value || 1))}
              disabled={!canVote || remainingVotes < 1}
              style={{ width: 160 }}
              addonAfter="票"
            />
            <Button
              type="primary"
              icon={<TrophyOutlined />}
              loading={pending}
              disabled={!canVote || remainingVotes < 1}
              onClick={handleVote}
            >
              确认投票
            </Button>
          </Space>
          <Button icon={<CopyOutlined />} onClick={copyShareLink}>
            复制分享页链接
          </Button>
        </Space>
      </Card>
    </div>
  );
}
