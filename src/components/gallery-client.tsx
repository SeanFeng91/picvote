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
  SearchOutlined,
  TrophyOutlined,
  UploadOutlined,
  UserOutlined
} from "@ant-design/icons";
import Link from "next/link";
import { startTransition, useDeferredValue, useEffect, useMemo, useState, useTransition } from "react";

import { Work } from "@/lib/types";

type GalleryClientProps = {
  initialWorks: Work[];
  initialRemainingVotes: number;
  canVote: boolean;
  currentWork?: Work | null;
  votedWorkIds?: string[];
  compactHome?: boolean;
};

type Filter = "all" | "image" | "video" | "voted";

export function GalleryClient({
  initialWorks,
  initialRemainingVotes,
  canVote,
  currentWork,
  votedWorkIds = [],
  compactHome = false
}: GalleryClientProps) {
  const { message } = App.useApp();
  const [works, setWorks] = useState(initialWorks);
  const [remainingVotes, setRemainingVotes] = useState(initialRemainingVotes);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [selectedId, setSelectedId] = useState(initialWorks[0]?.id ?? "");
  const [votedIds, setVotedIds] = useState(() => new Set(votedWorkIds));
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

  const votedIdSet = useMemo(() => votedIds, [votedIds]);
  const filteredWorks = useMemo(() => {
    const keyword = deferredSearch.trim().toLowerCase();
    return works.filter((work) => {
      const matchesSearch =
        !keyword ||
        `${work.code} ${work.title}`.toLowerCase().includes(keyword);
      const matchesFilter =
        filter === "all" ||
        work.mediaType === filter ||
        (filter === "voted" && votedIdSet.has(work.id));
      return matchesSearch && matchesFilter;
    });
  }, [deferredSearch, filter, votedIdSet, works]);

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
      setVotedIds((current) => new Set([...current, work.id]));
      setWorks((current) =>
        current.map((item) =>
          item.id === payload.work.id ? { ...item, voteCountCache: payload.work.voteCountCache } : item
        )
      );
      message.success(`已投出 ${count} 票，剩余 ${payload.remainingVotes} 票`);
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
                    type={votedIdSet.has(work.id) ? "default" : "primary"}
                    shape="circle"
                    loading={pending}
                    disabled={!canVote || remainingVotes < 1}
                    onClick={(event) => {
                      event.stopPropagation();
                      quickVote(work);
                    }}
                  >
                    ↑
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
                  type="primary"
                  icon={<TrophyOutlined />}
                  loading={pending}
                  disabled={!canVote || remainingVotes < 1}
                  onClick={() => quickVote(selectedWork)}
                >
                  投 1 票
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
