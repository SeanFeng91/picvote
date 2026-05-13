"use client";

import { Image, Segmented, Space, Typography } from "antd";
import { useEffect, useMemo, useState } from "react";

import { Work } from "@/lib/types";

type DisplayBoardProps = {
  initialMode: "wall" | "ranking";
  initialWorks: Work[];
  showPublicVotes: boolean;
};

export function DisplayBoard({ initialMode, initialWorks, showPublicVotes }: DisplayBoardProps) {
  const [mode, setMode] = useState(initialMode);
  const [works, setWorks] = useState(initialWorks);
  const [showVotes, setShowVotes] = useState(showPublicVotes);
  const topWork = works[0] ?? null;
  const runnerUps = useMemo(() => works.slice(1, 4), [works]);
  const restWorks = useMemo(() => works.slice(4), [works]);
  const totalVotes = works.reduce((sum, work) => sum + work.voteCountCache, 0);

  useEffect(() => {
    const timer = window.setInterval(async () => {
      const response = await fetch("/api/admin/ranking", { cache: "no-store" });
      if (!response.ok) {
        return;
      }
      const payload = await response.json();
      setWorks(payload.works);
      if (typeof payload.showPublicVotes === "boolean") {
        setShowVotes(payload.showPublicVotes);
      }
    }, 4000);
    return () => window.clearInterval(timer);
  }, []);

  function voteText(work: Work) {
    return showVotes ? `${work.voteCountCache} 票` : "票数隐藏";
  }

  function Media({ work, className = "display-work-media" }: { work: Work; className?: string }) {
    return work.mediaType === "image" ? (
      <Image src={work.previewUrl} alt={work.title} preview={false} className={className} />
    ) : (
      <video className={className} src={work.mediaUrl} muted playsInline />
    );
  }

  return (
    <div className="display-stage">
      <div className="display-header">
        <div>
          <Typography.Text style={{ color: "rgba(248,250,252,0.7)" }}>Vivo Pic Vote Display</Typography.Text>
          <Typography.Title style={{ color: "#f8fafc", margin: 0 }}>
            {mode === "wall" ? "作品墙" : "实时排名"}
          </Typography.Title>
          <div className="display-metrics">
            <span>{works.length} 件作品</span>
            <span>{showVotes ? `${totalVotes} 张有效票` : "票数由后台控制"}</span>
            <span>每 4 秒自动刷新</span>
          </div>
        </div>
        <Space>
          <Segmented
            value={mode}
            onChange={(value) => setMode(value as "wall" | "ranking")}
            options={[
              { label: "作品墙", value: "wall" },
              { label: "排行榜", value: "ranking" }
            ]}
          />
        </Space>
      </div>

      {mode === "wall" ? (
        <div className="display-grid">
          {works.map((work, index) => (
            <div className="display-work" key={work.id}>
              <Media work={work} />
              <div className="display-work-caption">
                <div className="spread display-work-title">
                  <strong>{work.code}</strong>
                  <span>#{index + 1}</span>
                </div>
                <div className="display-work-subtitle">{work.title}</div>
                <div className="display-work-votes">{voteText(work)}</div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="ranking-board">
          {topWork ? (
            <section className="rank-hero">
              <div className="rank-hero-media">
                <Media work={topWork} className="rank-hero-image" />
              </div>
              <div className="rank-hero-copy">
                <div className="rank-medal">#1</div>
                <div className="rank-code">{topWork.code}</div>
                <h2>{topWork.title}</h2>
                <div className="rank-score">{voteText(topWork)}</div>
              </div>
            </section>
          ) : null}

          {runnerUps.length ? (
            <section className="rank-podium">
              {runnerUps.map((work, index) => (
                <div className="rank-podium-item" key={work.id}>
                  <div className="rank-podium-place">#{index + 2}</div>
                  <Media work={work} className="rank-podium-media" />
                  <div className="rank-podium-copy">
                    <span>{work.code}</span>
                    <strong>{work.title}</strong>
                    <em>{voteText(work)}</em>
                  </div>
                </div>
              ))}
            </section>
          ) : null}

          {restWorks.length ? (
            <section className="rank-list">
              {restWorks.map((work, index) => (
                <div className="rank-item" key={work.id}>
                  <div className="rank-index">#{index + 5}</div>
                  <div className="rank-row-title">
                    <span>{work.code}</span>
                    <strong>{work.title}</strong>
                  </div>
                  <div className="rank-row-score">{voteText(work)}</div>
                </div>
              ))}
            </section>
          ) : null}

          {!works.length ? (
            <div className="display-empty">
              <div>暂无作品</div>
              <span>上传开始后，排行榜会自动刷新。</span>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
