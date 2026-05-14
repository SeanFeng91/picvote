"use client";

import {
  App,
  Badge,
  Button,
  Empty,
  Segmented,
  Input,
  Tag
} from "antd";
import {
  CameraOutlined,
  CheckOutlined,
  CloseOutlined,
  HomeOutlined,
  LeftOutlined,
  PictureOutlined,
  RightOutlined,
  RollbackOutlined,
  SearchOutlined,
  TrophyOutlined,
  UploadOutlined,
  UserOutlined
} from "@ant-design/icons";
import Link from "next/link";
import {
  startTransition,
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition
} from "react";

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

/* ===== Lazy Image with IntersectionObserver ===== */
function LazyImage({ src, alt }: { src: string; alt: string }) {
  const imgRef = useRef<HTMLImageElement>(null);
  const [loaded, setLoaded] = useState(false);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = imgRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          observer.disconnect();
        }
      },
      { rootMargin: "200px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <img
      ref={imgRef}
      src={inView ? src : undefined}
      alt={alt}
      className="photo-tile-media"
      loading="lazy"
      decoding="async"
      onLoad={() => setLoaded(true)}
      style={{
        opacity: loaded ? 1 : 0,
        transition: "opacity 0.3s ease"
      }}
    />
  );
}

/* ===== Lightbox Component ===== */
function Lightbox({
  works,
  index,
  onClose,
  onNav,
  canVote,
  remainingVotes,
  voteByWorkId,
  pending,
  onVote,
  onRevoke
}: {
  works: Work[];
  index: number;
  onClose: () => void;
  onNav: (idx: number) => void;
  canVote: boolean;
  remainingVotes: number;
  voteByWorkId: Map<string, Vote>;
  pending: boolean;
  onVote: (work: Work) => void;
  onRevoke: (work: Work) => void;
}) {
  const work = works[index];
  const touchStart = useRef<{ x: number; y: number; time: number } | null>(null);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft" && index > 0) onNav(index - 1);
      if (e.key === "ArrowRight" && index < works.length - 1) onNav(index + 1);
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [index, works.length, onClose, onNav]);

  function handleTouchStart(e: React.TouchEvent) {
    const touch = e.touches[0];
    touchStart.current = { x: touch.clientX, y: touch.clientY, time: Date.now() };
  }

  function handleTouchEnd(e: React.TouchEvent) {
    if (!touchStart.current) return;
    const touch = e.changedTouches[0];
    const dx = touch.clientX - touchStart.current.x;
    const dy = touch.clientY - touchStart.current.y;
    const elapsed = Date.now() - touchStart.current.time;
    touchStart.current = null;

    // Horizontal swipe
    if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5 && elapsed < 400) {
      if (dx < 0 && index < works.length - 1) onNav(index + 1);
      if (dx > 0 && index > 0) onNav(index - 1);
      return;
    }

    // Vertical swipe down to close
    if (dy > 100 && Math.abs(dy) > Math.abs(dx) * 1.5 && elapsed < 400) {
      onClose();
    }
  }

  if (!work) return null;

  const hasVoted = voteByWorkId.has(work.id);

  return (
    <div
      className="lightbox-overlay"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Header */}
      <div className="lightbox-header">
        <button className="lightbox-close" onClick={onClose} aria-label="关闭">
          <CloseOutlined />
        </button>
        <span className="lightbox-header-title">{work.title}</span>
        <Tag
          color={work.mediaType === "video" ? "orange" : "blue"}
          style={{ margin: 0, borderRadius: 10 }}
        >
          {work.mediaType === "video" ? "视频" : "图片"}
        </Tag>
      </div>

      {/* Media */}
      <div className="lightbox-body">
        {work.mediaType === "image" ? (
          <img
            key={work.id}
            className="lightbox-image"
            src={work.previewUrl}
            alt={work.title}
            draggable={false}
          />
        ) : (
          <video
            key={work.id}
            className="lightbox-video"
            src={work.mediaUrl}
            controls
            playsInline
            autoPlay
          />
        )}
      </div>

      {/* Desktop Nav Arrows */}
      {index > 0 && (
        <button className="lightbox-nav prev" onClick={() => onNav(index - 1)}>
          <LeftOutlined />
        </button>
      )}
      {index < works.length - 1 && (
        <button className="lightbox-nav next" onClick={() => onNav(index + 1)}>
          <RightOutlined />
        </button>
      )}

      {/* Footer */}
      <div className="lightbox-footer">
        <div className="lightbox-info">
          <div className="lightbox-info-left">
            <span className="lightbox-info-code">{work.code}</span>
            <span className="lightbox-info-title">{work.title}</span>
          </div>
          <span className="lightbox-info-votes">{work.voteCountCache} 票</span>
        </div>
        <div className="lightbox-actions">
          <Button
            type={hasVoted ? "default" : "primary"}
            icon={hasVoted ? <RollbackOutlined /> : <TrophyOutlined />}
            loading={pending}
            disabled={!canVote || (!hasVoted && remainingVotes < 1)}
            onClick={() => (hasVoted ? onRevoke(work) : onVote(work))}
            block
          >
            {hasVoted
              ? `撤回 ${voteByWorkId.get(work.id)?.count ?? 1} 票`
              : `投 1 票（剩${remainingVotes}）`}
          </Button>
          <Link href={`/works/${work.code}`}>
            <Button style={{ borderRadius: 20, color: "#fff", borderColor: "rgba(255,255,255,0.3)" }} ghost>
              详情
            </Button>
          </Link>
        </div>
        <div className="lightbox-counter">
          {index + 1} / {works.length}
        </div>
      </div>
    </div>
  );
}

/* ===== Main Gallery Component ===== */
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
  const [myVotes, setMyVotes] = useState(initialVotes);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [pending, startVoteTransition] = useTransition();
  const deferredSearch = useDeferredValue(search);

  // Auto-refresh data periodically
  useEffect(() => {
    const timer = window.setInterval(async () => {
      try {
        const response = await fetch("/api/works", { cache: "no-store" });
        if (!response.ok) return;
        const payload = await response.json();
        startTransition(() => {
          setWorks(payload.works);
          if (typeof payload.remainingVotes === "number") {
            setRemainingVotes(payload.remainingVotes);
          }
        });
      } catch {
        // silently ignore network errors
      }
    }, 15000);
    return () => window.clearInterval(timer);
  }, []);

  const activeVotes = useMemo(
    () => myVotes.filter((vote) => vote.status === "valid"),
    [myVotes]
  );
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

  const totalVotes = useMemo(
    () => works.reduce((sum, work) => sum + work.voteCountCache, 0),
    [works]
  );

  const quickVote = useCallback(
    async (work: Work, count = 1) => {
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
        setMyVotes((current) => [
          payload.vote,
          ...current.filter((vote) => vote.id !== payload.vote.id)
        ]);
        setWorks((current) =>
          current.map((item) =>
            item.id === payload.work.id
              ? { ...item, voteCountCache: payload.work.voteCountCache }
              : item
          )
        );
        message.success(`已投出 ${count} 票，剩余 ${payload.remainingVotes} 票`);
      });
    },
    [canVote, remainingVotes, message]
  );

  const revoke = useCallback(
    async (work: Work) => {
      const vote = voteByWorkId.get(work.id);
      if (!vote) return;
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
        setMyVotes((current) =>
          current.map((item) => (item.id === vote.id ? payload.vote : item))
        );
        setWorks((current) =>
          current.map((item) =>
            item.id === payload.work.id
              ? { ...item, voteCountCache: payload.work.voteCountCache }
              : item
          )
        );
        message.success(
          `已撤回 ${vote.count} 票，剩余 ${payload.remainingVotes} 票`
        );
      });
    },
    [voteByWorkId, message]
  );

  const openLightbox = useCallback(
    (workId: string) => {
      const idx = filteredWorks.findIndex((w) => w.id === workId);
      if (idx >= 0) setLightboxIndex(idx);
    },
    [filteredWorks]
  );

  const handleLightboxNav = useCallback((idx: number) => {
    setLightboxIndex(idx);
  }, []);

  const closeLightbox = useCallback(() => {
    setLightboxIndex(null);
  }, []);

  return (
    <div className="stack">
      {/* ===== Toolbar ===== */}
      <div className="photo-toolbar">
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <div className="spread">
            <Input
              allowClear
              prefix={<SearchOutlined />}
              placeholder="搜编号 / 标题"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              style={{ flex: 1, maxWidth: 280 }}
            />
            <Badge count={remainingVotes} overflowCount={999} showZero>
              <Button type="primary" icon={<TrophyOutlined />} disabled={!canVote} size="middle">
                剩余票
              </Button>
            </Badge>
          </div>
          <Segmented
            value={filter}
            onChange={(value) => setFilter(value as Filter)}
            options={[
              { label: "全部", value: "all" },
              { label: "图片", value: "image" },
              { label: "视频", value: "video" },
              { label: "已投", value: "voted" }
            ]}
            block
            size="middle"
          />
        </div>
      </div>

      {/* ===== Compact Stats (Home only) ===== */}
      {compactHome && (
        <div className="stats-strip">
          <div className="stat-chip">
            作品 <strong>{works.length}</strong>
          </div>
          <div className="stat-chip">
            总票 <strong>{totalVotes}</strong>
          </div>
          <div className="stat-chip accent">
            我的编号 <strong>{currentWork?.code ?? "--"}</strong>
          </div>
          <div className="stat-chip accent">
            剩余 <strong>{remainingVotes}</strong> 票
          </div>
        </div>
      )}

      {/* ===== Photo Grid ===== */}
      {filteredWorks.length ? (
        <div className="photo-grid">
          {filteredWorks.map((work) => {
            const hasVoted = voteByWorkId.has(work.id);
            return (
              <div
                className="photo-tile"
                key={work.id}
                role="button"
                tabIndex={0}
                onClick={() => openLightbox(work.id)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") openLightbox(work.id);
                }}
              >
                {work.mediaType === "image" ? (
                  <LazyImage src={work.previewUrl} alt={work.title} />
                ) : (
                  <video
                    className="photo-tile-media"
                    src={work.mediaUrl}
                    muted
                    playsInline
                    preload="none"
                    poster={work.previewUrl || undefined}
                  />
                )}
                {hasVoted && (
                  <div className="tile-voted-badge">
                    <CheckOutlined />
                  </div>
                )}
                <div className="tile-vote">
                  <Button
                    size="small"
                    type={hasVoted ? "default" : "primary"}
                    shape="circle"
                    loading={pending}
                    disabled={
                      !canVote || (!hasVoted && remainingVotes < 1)
                    }
                    onClick={(event) => {
                      event.stopPropagation();
                      if (hasVoted) {
                        revoke(work);
                      } else {
                        quickVote(work);
                      }
                    }}
                  >
                    {hasVoted ? (
                      <RollbackOutlined />
                    ) : (
                      <TrophyOutlined />
                    )}
                  </Button>
                </div>
                <div className="tile-shade">
                  <div className="spread">
                    <span className="tile-code">{work.code}</span>
                    <span style={{ fontSize: 11 }}>{work.voteCountCache}票</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div style={{ padding: "40px 16px", textAlign: "center" }}>
          <Empty description="没有匹配的作品" />
        </div>
      )}

      {/* ===== Lightbox ===== */}
      {lightboxIndex !== null && (
        <Lightbox
          works={filteredWorks}
          index={lightboxIndex}
          onClose={closeLightbox}
          onNav={handleLightboxNav}
          canVote={canVote}
          remainingVotes={remainingVotes}
          voteByWorkId={voteByWorkId}
          pending={pending}
          onVote={(w) => quickVote(w)}
          onRevoke={(w) => revoke(w)}
        />
      )}

      {/* ===== Mobile Tab Bar ===== */}
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
