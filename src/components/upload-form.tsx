"use client";

import {
  App,
  Alert,
  Button,
  Card,
  Form,
  Image,
  Input,
  Progress,
  Space,
  Statistic,
  Tag,
  Typography
} from "antd";
import { CameraOutlined, DeleteOutlined, FolderOpenOutlined, UploadOutlined } from "@ant-design/icons";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChangeEvent, useMemo, useRef, useState } from "react";

import { Work, UploadPartRecord } from "@/lib/types";
import {
  IMAGE_MAX_BYTES,
  UPLOAD_CONCURRENCY,
  UPLOAD_RETRY_LIMIT,
  VIDEO_MAX_BYTES,
  validateUploadFile
} from "@/lib/upload-limits";

type UploadFormProps = {
  currentWork: Work | null;
  canUpload: boolean;
};

type InitResponse = {
  uploadId: string;
  partSize: number;
  totalParts: number;
  uploadedParts: UploadPartRecord[];
};

function inferMediaType(file: File | null) {
  return file?.type.startsWith("video/") ? "video" : "image";
}

async function uploadPart(input: { uploadId: string; partNumber: number; chunk: Blob }) {
  let lastError = "";
  for (let attempt = 1; attempt <= UPLOAD_RETRY_LIMIT; attempt += 1) {
    const response = await fetch(`/api/uploads/${input.uploadId}/parts/${input.partNumber}`, {
      method: "PUT",
      body: input.chunk
    });
    const payload = await response.json();
    if (response.ok) {
      return payload.part as UploadPartRecord;
    }
    lastError = payload.error || "分片上传失败";
  }
  throw new Error(lastError || "分片上传失败");
}

export function UploadForm({ currentWork, canUpload }: UploadFormProps) {
  const router = useRouter();
  const { message, modal } = App.useApp();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const [form] = Form.useForm<{ title: string }>();
  const [file, setFile] = useState<File | null>(null);
  const [pending, setPending] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [uploadId, setUploadId] = useState("");

  const previewUrl = useMemo(() => (file ? URL.createObjectURL(file) : ""), [file]);
  const mediaType = inferMediaType(file);

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const nextFile = event.target.files?.[0] ?? null;
    if (!nextFile) {
      return;
    }
    try {
      validateUploadFile({ mimeType: nextFile.type, sizeBytes: nextFile.size });
      setFile(nextFile);
      setProgress(0);
    } catch (error) {
      message.error(error instanceof Error ? error.message : "文件不符合上传规则");
    }
  }

  async function handleDelete() {
    if (!currentWork) {
      return;
    }
    modal.confirm({
      title: `删除作品 ${currentWork.code}`,
      content: "删除后当前作品将从相册移除，已获得票数会作废并保留审计记录。",
      okText: "删除后重传",
      okButtonProps: { danger: true },
      cancelText: "取消",
      async onOk() {
        setDeleting(true);
        const response = await fetch(`/api/works/${currentWork.id}`, { method: "DELETE" });
        const payload = await response.json();
        setDeleting(false);
        if (!response.ok) {
          message.error(payload.error || "删除失败");
          return;
        }
        message.success("已删除，可以重新上传");
        router.refresh();
      }
    });
  }

  async function startUpload(values: { title: string }) {
    if (!file) {
      message.warning("请先选择图片或视频");
      return;
    }
    const uploadFile = file;

    setPending(true);
    setProgress(0);
    try {
      const initResponse = await fetch("/api/uploads/init", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: values.title || "",
          fileName: uploadFile.name,
          mimeType: uploadFile.type,
          sizeBytes: uploadFile.size
        })
      });
      const initPayload = (await initResponse.json()) as InitResponse & { error?: string };
      if (!initResponse.ok) {
        throw new Error(initPayload.error || "无法创建上传会话");
      }

      setUploadId(initPayload.uploadId);
      const uploadedParts: UploadPartRecord[] = [];
      let uploadedBytes = 0;
      let nextPart = 1;

      async function worker() {
        while (nextPart <= initPayload.totalParts) {
          const partNumber = nextPart;
          nextPart += 1;
          const start = (partNumber - 1) * initPayload.partSize;
          const end = Math.min(start + initPayload.partSize, uploadFile.size);
          const part = await uploadPart({
            uploadId: initPayload.uploadId,
            partNumber,
            chunk: uploadFile.slice(start, end)
          });
          uploadedParts.push(part);
          uploadedBytes += end - start;
          setProgress(Math.round((uploadedBytes / uploadFile.size) * 92));
        }
      }

      await Promise.all(
        Array.from({ length: Math.min(UPLOAD_CONCURRENCY, initPayload.totalParts) }, () => worker())
      );

      const completeResponse = await fetch(`/api/uploads/${initPayload.uploadId}/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ parts: uploadedParts.sort((a, b) => a.partNumber - b.partNumber) })
      });
      const completePayload = await completeResponse.json();
      if (!completeResponse.ok) {
        throw new Error(completePayload.error || "完成上传失败");
      }

      setProgress(100);
      message.success(`上传成功，作品编号 ${completePayload.work.code}`);
      router.push(`/works/${completePayload.work.code}`);
      router.refresh();
    } catch (error) {
      message.error(error instanceof Error ? error.message : "上传失败");
      setPending(false);
    }
  }

  async function abortUpload() {
    if (!uploadId) {
      setPending(false);
      return;
    }
    await fetch(`/api/uploads/${uploadId}/abort`, { method: "POST" });
    setPending(false);
    setUploadId("");
    setProgress(0);
    message.info("已取消上传");
  }

  if (!canUpload) {
    return (
      <Card>
        <Alert
          type="warning"
          showIcon
          message="当前账号没有上传权限"
          description="管理员可以在后台调整你的上传开关。"
        />
      </Card>
    );
  }

  if (currentWork) {
    return (
      <Card>
        <Space direction="vertical" size={16} style={{ width: "100%" }}>
          <div className="spread">
            <Space direction="vertical" size={2}>
              <Tag color="blue">{currentWork.code}</Tag>
              <Typography.Title level={3} style={{ margin: 0 }}>
                {currentWork.title}
              </Typography.Title>
              <Typography.Text type="secondary">当前作品已在相册中展示。若要替换，请先删除原作品。</Typography.Text>
            </Space>
            <Statistic title="当前得票" value={currentWork.voteCountCache} suffix="票" />
          </div>
          <div className="detail-media-shell">
            {currentWork.mediaType === "image" ? (
              <Image
                src={currentWork.previewUrl}
                alt={currentWork.title}
                style={{ width: "100%", maxHeight: 520, objectFit: "contain" }}
              />
            ) : (
              <video src={currentWork.mediaUrl} controls playsInline className="detail-media" />
            )}
          </div>
          <Space wrap>
            <Link href={currentWork.sharePath}>
              <Button>查看分享页</Button>
            </Link>
            <Button danger icon={<DeleteOutlined />} loading={deleting} onClick={handleDelete}>
              删除后重传
            </Button>
          </Space>
        </Space>
      </Card>
    );
  }

  return (
    <Card>
      <Space direction="vertical" size={16} style={{ width: "100%" }}>
        <div>
          <Typography.Title level={2} style={{ margin: 0 }}>
            上传作品
          </Typography.Title>
          <Typography.Text type="secondary">
            图片上限 {IMAGE_MAX_BYTES / 1024 / 1024}MB，视频上限 {VIDEO_MAX_BYTES / 1024 / 1024}MB；大文件会自动分片上传。
          </Typography.Text>
        </div>

        <Form form={form} layout="vertical" onFinish={startUpload} initialValues={{ title: "" }}>
          <Form.Item name="title" label="作品名称">
            <Input placeholder="留空时使用默认作品名" maxLength={40} showCount />
          </Form.Item>

          <div className="upload-dropzone">
            <Space direction="vertical" size={12} style={{ width: "100%" }}>
              <Space wrap>
                <Button icon={<CameraOutlined />} onClick={() => cameraInputRef.current?.click()}>
                  拍摄 / 录制
                </Button>
                <Button icon={<FolderOpenOutlined />} onClick={() => fileInputRef.current?.click()}>
                  从相册选择
                </Button>
              </Space>
              <Typography.Text type="secondary">
                支持 JPG、PNG、WebP、HEIC 等图片和常见视频格式；上传过程中请保持页面打开。
              </Typography.Text>
              <input
                ref={cameraInputRef}
                hidden
                type="file"
                accept="image/*,video/*"
                capture="environment"
                onChange={handleFileChange}
              />
              <input ref={fileInputRef} hidden type="file" accept="image/*,video/*" onChange={handleFileChange} />
            </Space>
          </div>

          {previewUrl ? (
            <div className="detail-media-shell">
              {mediaType === "image" ? (
                <Image src={previewUrl} alt="预览" style={{ width: "100%", maxHeight: 520, objectFit: "contain" }} />
              ) : (
                <video src={previewUrl} controls playsInline className="detail-media" />
              )}
            </div>
          ) : null}

          {pending ? <Progress percent={progress} status={progress === 100 ? "success" : "active"} /> : null}

          <Space wrap>
            <Button type="primary" htmlType="submit" icon={<UploadOutlined />} loading={pending}>
              {pending ? "上传中" : "确认上传"}
            </Button>
            {pending ? <Button onClick={abortUpload}>取消上传</Button> : null}
            <Link href="/">
              <Button>返回相册</Button>
            </Link>
          </Space>
        </Form>
      </Space>
    </Card>
  );
}
