"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChangeEvent, FormEvent, useMemo, useState } from "react";

import { Work } from "@/lib/types";

type UploadFormProps = {
  currentWork: Work | null;
  canUpload: boolean;
};

function inferMediaType(file: File | null) {
  if (!file) {
    return "image";
  }
  return file.type.startsWith("video/") ? "video" : "image";
}

export function UploadForm({ currentWork, canUpload }: UploadFormProps) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const previewUrl = useMemo(() => (file ? URL.createObjectURL(file) : ""), [file]);
  const mediaType = inferMediaType(file);

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    setFile(event.target.files?.[0] ?? null);
    setMessage("");
  }

  async function handleDelete() {
    if (!currentWork) {
      return;
    }
    setDeleting(true);
    const response = await fetch(`/api/works/${currentWork.id}`, { method: "DELETE" });
    const payload = await response.json();
    if (!response.ok) {
      setDeleting(false);
      setMessage(payload.error || "删除失败");
      return;
    }
    router.refresh();
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!file) {
      setMessage("请先选择图片或视频");
      return;
    }
    setPending(true);
    setMessage("");
    const formData = new FormData();
    formData.set("title", title);
    formData.set("file", file);

    const response = await fetch("/api/works", {
      method: "POST",
      body: formData
    });
    const payload = await response.json();
    if (!response.ok) {
      setPending(false);
      setMessage(payload.error || "上传失败");
      return;
    }
    router.push(`/works/${payload.work.code}`);
    router.refresh();
  }

  if (!canUpload) {
    return (
      <div className="panel card stack">
        <strong>当前账号没有上传权限</strong>
        <span className="hint">管理员可以在后台调整你的上传开关。</span>
      </div>
    );
  }

  if (currentWork) {
    return (
      <div className="panel stack hero-panel">
        <div className="spread">
          <div>
            <div className="work-code">{currentWork.code}</div>
            <h2 style={{ margin: "6px 0" }}>{currentWork.title}</h2>
            <div className="hint">
              当前作品已在相册中展示。若要替换，请先删除原作品。
            </div>
          </div>
          <span className="badge">当前得票 {currentWork.voteCountCache}</span>
        </div>
        {currentWork.mediaType === "image" ? (
          <img className="work-media" src={currentWork.previewUrl} alt={currentWork.title} style={{ maxHeight: 420 }} />
        ) : (
          <video className="work-media" src={currentWork.mediaUrl} controls style={{ maxHeight: 420 }} />
        )}
        <div className="row">
          <Link href={currentWork.sharePath} className="button-secondary">
            查看分享页
          </Link>
          <button className="button-danger" type="button" onClick={handleDelete} disabled={deleting}>
            {deleting ? "删除中..." : "删除后重传"}
          </button>
        </div>
        {message ? <div className="warning">{message}</div> : null}
      </div>
    );
  }

  return (
    <form className="panel hero-panel stack" onSubmit={handleSubmit}>
      <div className="brand-lockup">
        <span className="eyebrow">Upload</span>
        <h1 className="headline" style={{ fontSize: "clamp(30px, 5vw, 44px)" }}>
          上传你的作品
        </h1>
        <p className="subtle" style={{ margin: 0 }}>
          支持图片或视频，每人只保留 1 个有效作品。
        </p>
      </div>
      <label className="stack">
        <span>作品名称</span>
        <input
          className="input"
          placeholder="例如：夜归时的风景"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
        />
      </label>
      <label className="stack">
        <span>作品文件</span>
        <input className="input" type="file" accept="image/*,video/*" onChange={handleFileChange} />
        <span className="hint">图片建议 15MB 内，视频建议 80MB 内。移动端支持拍照和读取相册。</span>
      </label>
      {previewUrl ? (
        mediaType === "image" ? (
          <img className="work-media" src={previewUrl} alt="预览" style={{ maxHeight: 380 }} />
        ) : (
          <video className="work-media" src={previewUrl} controls style={{ maxHeight: 380 }} />
        )
      ) : null}
      <div className="fixed-action-bar">
        <button className="button" type="submit" disabled={pending}>
          {pending ? "上传中..." : "确认上传"}
        </button>
      </div>
      {message ? <div className="warning">{message}</div> : null}
    </form>
  );
}
