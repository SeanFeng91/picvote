"use client";

import { useEffect, useState } from "react";

import { Work } from "@/lib/types";

type DisplayBoardProps = {
  initialMode: "wall" | "ranking";
  initialWorks: Work[];
};

export function DisplayBoard({ initialMode, initialWorks }: DisplayBoardProps) {
  const [mode, setMode] = useState(initialMode);
  const [works, setWorks] = useState(initialWorks);

  useEffect(() => {
    const timer = window.setInterval(async () => {
      const response = await fetch("/api/admin/ranking", { cache: "no-store" });
      if (!response.ok) {
        return;
      }
      const payload = await response.json();
      setWorks(payload.works);
    }, 4000);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <div className="display-stage">
      <div className="spread" style={{ marginBottom: 20 }}>
        <div>
          <div className="eyebrow" style={{ color: "rgba(255,248,241,0.7)" }}>
            Display
          </div>
          <h1 className="headline" style={{ margin: 0 }}>
            {mode === "wall" ? "作品墙" : "排行榜"}
          </h1>
        </div>
        <div className="row">
          <button className="button-secondary" onClick={() => setMode("wall")}>
            作品墙
          </button>
          <button className="button" onClick={() => setMode("ranking")}>
            排行榜
          </button>
        </div>
      </div>

      {mode === "wall" ? (
        <div className="display-grid">
          {works.map((work) => (
            <div className="display-work" key={work.id}>
              {work.mediaType === "image" ? (
                <img className="work-media" src={work.previewUrl} alt={work.title} />
              ) : (
                <video className="work-media" src={work.mediaUrl} muted playsInline />
              )}
              <div className="work-body">
                <div className="spread">
                  <strong>{work.code}</strong>
                  <span>{work.voteCountCache} 票</span>
                </div>
                <div className="hint" style={{ color: "rgba(255,248,241,0.72)" }}>
                  {work.ownerEmployeeNo} · {work.ownerDisplayName}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="rank-list">
          {works.map((work, index) => (
            <div className="rank-item" key={work.id}>
              <div style={{ fontSize: 34, fontWeight: 700 }}>#{index + 1}</div>
              <div>
                <div className="work-code" style={{ color: "rgba(255,248,241,0.8)" }}>
                  {work.code}
                </div>
                <div style={{ fontSize: 26, fontWeight: 700 }}>{work.title}</div>
                <div className="hint" style={{ color: "rgba(255,248,241,0.72)" }}>
                  上传人工号 {work.ownerEmployeeNo} · {work.ownerDisplayName}
                </div>
              </div>
              <div style={{ fontSize: 28, fontWeight: 700, textAlign: "right" }}>{work.voteCountCache} 票</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
