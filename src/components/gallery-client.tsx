"use client";

import {
  App,
  Badge,
  Button,
  Card,
  Empty,
  Image,
  Input,
  Segmented,
  Space,
  Statistic,
  Tag,
  Typography
} from "antd";
import {
  CameraOutlined,
  HomeOutlined,
  PictureOutlined,
  RollbackOutlined,
  SearchOutlined,
  TrophyOutlined,
  UploadOutlined,
  UserOutlined
} from "@ant-design/icons";
import Link from "next/link";
import { startTransition, useDeferredValue, useEffect, useMemo, useState, useTransition } from "react";

import { Work } from "@/lib/types";
import type { Vote } from "@/lib/types";

type GalleryClientProps = {
  initialWorks: Work[];
  initialRemainingVotes: number;
  canVote: boolean;
  currentWork?: Work | null;
  initialVotes?: Vote[];
  compactHome?: boolean;
};

type Filter = "all" | "image" | "video" | "voted";

export function GalleryClient({
  initialWorks,
  initialRemainingVotes,
  canVote,
  currentWork,
  initialVotes = [],
  compactHome = false
}: GalleryClientProps) {
  const { message } = App.useApp();
  const [works, setWorks] = useState(initialWorks);
  const [remainingVotes, setRemainingVotes] = useState(initialRemainingVotes);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [selectedId, setSelectedId] = useState(initialWorks[0]?.id ?? "");
  const [myVotes, setMyVotes] = useState(initialVotes);
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

  const activeVotes = useMemo(() => myVotes.filter((vote) => vote.status === "valid"), [myVotes]);
  const voteByWorkId = useMemo(() => {
    const map = new Map<string, Vote>();
    for (const vote of activeVotes) {
      map.set(vote.workId, vote);
    }
    return map;
  }, [activeVotes]);
  const filteredWorks = useMemo(() => {
    const keyword = deferredSearch.trim().toLowerCase();
    return works.filter((work) => {
      const matchesSearch =
        !keyword ||
        `${work.code} ${work.title}`.toLowerCase().includes(keyword);
      const matchesFilter =
        filter === "all" ||
        work.mediaType === filter ||
        (filter === "voted" && voteByWorkId.has(work.id));
      return matchesSearch && matchesFilter;
    });
  }, [deferredSearch, filter, voteByWorkId, works]);

  const selectedWork = works.find((work) => work.id === selectedId) ?? filteredWorks[0] ?? works[0] ?? null;
  const totalVotes = works.reduce((sum, work) => sum + work.voteCountCache, 0);

  async function quickVote(work: Work, count = 1) {
    if (!canVote || remainingVotes < count) {
      message.warning("剩余票数不足或当前账号不可投票");
      return;
    }
    startVoteTransition(async () => {
      const response = await fetch("/api/votes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workId: work.id, count })
      });
      const payload = await response.json();
      if (!response.ok) {
        message.error(payload.error || "投票失败");
        return;
      }
      setRemainingVotes(payload.remainingVotes);
      setMyVotes((current) => [payload.vote, ...current.filter((vote) => vote.id !== payload.vote.id)]);
      setWorks((current) =>
        current.map((item) =>
          item.id === payload.work.id ? { ...item, voteCountCache: payload.work.voteCountCache } : item
        )
      );
      message.success(`已投出 ${count} 票，剩余 ${payload.remainingVotes} 票`);
    });
  }

  async function revoke(work: Work) {
    const vote = voteByWorkId.get(work.id);
    if (!vote) {
      return;
    }
    startVoteTransition(async () => {
      const response = await fetch("/api/votes", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ voteId: vote.id })
      });
      const payload = await response.json();
      if (!response.ok) {
        message.error(payload.error || "撤回失败");
        return;
      }
      setRemainingVotes(payload.remainingVotes);
      setMyVotes((current) => current.map((item) => (item.id === vote.id ? payload.vote : item)));
      setWorks((current) =>
        current.map((item) =>
          item.id === payload.work.id ? { ...item, voteCountCache: payload.work.voteCountCache } : item
        )
      );
      message.success(`已撤回 ${vote.count} 票，剩余 ${payload.remainingVotes} 票`);
    });
  }

  return (
    <div className="stack">
      <div className="photo-toolbar">
        <Space direction="vertical" size={8} style={{ width: "100%" }}>
          <div className="spread">
            <Space wrap>
              <Input
                allowClear
                prefix={<SearchOutlined />}
                placeholder="搜编号 / 标题"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                style={{ width: 260 }}
              />
              <Segmented
                value={filter}
                onChange={(value) => setFilter(value as Filter)}
                options={[
                  { label: "全部", value: "all" },
                  { label: "图片", value: "image" },
                  { label: "视频", value: "video" },
                  { label: "我投过", value: "voted" }
                ]}
              />
            </Space>
            <Space wrap>
              <Badge count={remainingVotes} overflowCount={999} showZero>
                <Button type="primary" icon={<TrophyOutlined />} disabled={!canVote}>
                  剩余票
                </Button>
              </Badge>
              <Link href="/upload">
                <Button icon={<UploadOutlined />}>{currentWork ? "我的作品" : "上传"}</Button>
              </Link>
            </Space>
          </div>
          {compactHome ? (
            <div className="stats-grid">
              <Card size="small">
                <Statistic title="有效作品" value={works.length} suffix="件" />
              </Card>
              <Card size="small">
                <Statistic title="已投票数" value={totalVotes} suffix="票" />
              </Card>
              <Card size="small">
                <Statistic title="我的编号" value={currentWork?.code ?? "--"} />
              </Card>
              <Card size="small">
                <Statistic title="剩余票数" value={remainingVotes} suffix="票" />
              </Card>
            </div>
          ) : null}
        </Space>
      </div>

      <div className="photo-workbench">
        {filteredWorks.length ? (
          <div className="photo-grid">
            {filteredWorks.map((work) => (
              <div
                className="photo-tile"
                key={work.id}
                role="button"
                tabIndex={0}
                onClick={() => setSelectedId(work.id)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    setSelectedId(work.id);
                  }
                }}
              >
                {work.mediaType === "image" ? (
                  <Image
                    src={work.previewUrl}
                    alt={work.title}
                    preview={false}
                    className="photo-tile-media"
                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                  />
                ) : (
                  <video className="photo-tile-media" src={work.mediaUrl} muted playsInline />
                )}
                <div className="tile-vote">
                  <Button
                    size="small"
                    type={voteByWorkId.has(work.id) ? "default" : "primary"}
                    shape="circle"
                    loading={pending}
                    disabled={!canVote || (!voteByWorkId.has(work.id) && remainingVotes < 1)}
                    onClick={(event) => {
                      event.stopPropagation();
                      if (voteByWorkId.has(work.id)) {
                        revoke(work);
                      } else {
                        quickVote(work);
                      }
                    }}
                  >
                    {voteByWorkId.has(work.id) ? <RollbackOutlined /> : <TrophyOutlined />}
                  </Button>
                </div>
                <div className="tile-shade">
                  <div className="spread">
                    <span className="tile-code">{work.code}</span>
                    <span>{work.voteCountCache}票</span>
                  </div>
                  <div className="tile-meta">{work.title}</div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <Card>
            <Empty description="没有匹配的作品" />
          </Card>
        )}

        <Card
          title="快速详情"
          extra={selectedWork ? <Link href={`/works/${selectedWork.code}`}>打开详情</Link> : null}
          styles={{ body: { padding: 12 } }}
        >
          {selectedWork ? (
            <Space direction="vertical" size={12} style={{ width: "100%" }}>
              <div style={{ overflow: "hidden", borderRadius: 8, background: "#0b1220" }}>
                {selectedWork.mediaType === "image" ? (
                  <Image
                    src={selectedWork.previewUrl}
                    alt={selectedWork.title}
                    preview
                    style={{ width: "100%", maxHeight: 360, objectFit: "contain" }}
                  />
                ) : (
                  <video
                    src={selectedWork.mediaUrl}
                    controls
                    playsInline
                    style={{ width: "100%", maxHeight: 360, display: "block" }}
                  />
                )}
              </div>
              <Space direction="vertical" size={4}>
                <Space wrap>
                  <Tag color="blue">{selectedWork.code}</Tag>
                  <Tag>{selectedWork.mediaType === "video" ? "视频" : "图片"}</Tag>
                  {currentWork?.id === selectedWork.id ? <Tag color="green">我的作品</Tag> : null}
                </Space>
                <Typography.Title level={4} style={{ margin: 0 }}>
                  {selectedWork.title}
                </Typography.Title>
              </Space>
              <div className="stats-grid" style={{ gridTemplateColumns: "1fr 1fr" }}>
                <Card size="small">
                  <Statistic title="当前票数" value={selectedWork.voteCountCache} suffix="票" />
                </Card>
                <Card size="small">
                  <Statistic title="我剩余" value={remainingVotes} suffix="票" />
                </Card>
              </div>
              <Space wrap>
                <Button
                  type={voteByWorkId.has(selectedWork.id) ? "default" : "primary"}
                  icon={<TrophyOutlined />}
                  loading={pending}
                  disabled={!canVote || (!voteByWorkId.has(selectedWork.id) && remainingVotes < 1)}
                  onClick={() => (voteByWorkId.has(selectedWork.id) ? revoke(selectedWork) : quickVote(selectedWork))}
                >
                  {voteByWorkId.has(selectedWork.id) ? `撤回 ${voteByWorkId.get(selectedWork.id)?.count ?? 1} 票` : "投 1 票"}
                </Button>
                <Link href={`/share/${selectedWork.code}`}>
                  <Button>分享页</Button>
                </Link>
              </Space>
            </Space>
          ) : (
            <Empty description="请选择作品" />
          )}
        </Card>
      </div>

      <nav className="mobile-tabbar">
        <Link href="/" aria-current={compactHome ? "page" : undefined}>
          <HomeOutlined />
          首页
        </Link>
        <Link href="/gallery" aria-current={!compactHome ? "page" : undefined}>
          <PictureOutlined />
          相册
        </Link>
        <Link href="/upload">
          <CameraOutlined />
          上传
        </Link>
        <Link href="/me/votes">
          <UserOutlined />
          我的
        </Link>
      </nav>
    </div>
  );
}
