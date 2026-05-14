import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";

import { getMediaBucket, getPublicBaseUrl } from "@/lib/cloudflare";
import { UploadPartRecord, UploadSession } from "@/lib/types";

type R2Object = {
  writeHttpMetadata(headers: Headers): void;
};

type R2MultipartUpload = {
  uploadId: string;
  uploadPart(partNumber: number, body: ArrayBuffer | Uint8Array): Promise<{ etag: string }>;
  complete(parts: { partNumber: number; etag: string }[]): Promise<R2Object>;
  abort(): Promise<void>;
};

type R2BucketLike = {
  createMultipartUpload(key: string, options?: { httpMetadata?: { contentType?: string } }): Promise<R2MultipartUpload>;
  resumeMultipartUpload(key: string, uploadId: string): R2MultipartUpload;
  put(key: string, value: ArrayBuffer | Uint8Array, options?: { httpMetadata?: { contentType?: string } }): Promise<R2Object>;
  delete(key: string): Promise<void>;
};

const uploadDir = path.join(process.cwd(), "public", "uploads");
const uploadSessionDir = path.join(process.cwd(), "data", "upload-sessions");

function extensionFor(file: File) {
  const name = file.name.split(".").pop()?.toLowerCase();
  if (name) {
    return name;
  }
  if (file.type === "video/mp4") {
    return "mp4";
  }
  if (file.type === "image/png") {
    return "png";
  }
  if (file.type === "image/jpeg") {
    return "jpg";
  }
  return "bin";
}

async function getBucket() {
  return (await getMediaBucket()) as R2BucketLike | null;
}

async function publicUrlForKey(key: string) {
  const baseUrl = await getPublicBaseUrl();
  if (baseUrl) {
    return `${baseUrl.replace(/\/$/, "")}/media/${key}`;
  }
  return `/media/${key}`;
}

export async function createStorageMultipartUpload(objectKey: string, contentType: string) {
  const bucket = await getBucket();
  if (!bucket) {
    return null;
  }
  return bucket.createMultipartUpload(objectKey, {
    httpMetadata: { contentType: contentType || "application/octet-stream" }
  });
}

export async function saveUploadedFile(file: File, workKey: string) {
  const bucket = await getBucket();
  const ext = extensionFor(file);
  const fileName = `${workKey}.${ext}`;
  const bytes = Buffer.from(await file.arrayBuffer());
  if (bucket) {
    const key = `legacy/${fileName}`;
    await bucket.put(key, bytes, { httpMetadata: { contentType: file.type || "application/octet-stream" } });
    const url = await publicUrlForKey(key);
    return {
      mediaUrl: url,
      previewUrl: url,
      mimeType: file.type || "application/octet-stream",
      originalFileName: file.name,
      sizeBytes: file.size
    };
  }

  await fs.mkdir(uploadDir, { recursive: true });
  const absolutePath = path.join(uploadDir, fileName);
  await fs.writeFile(absolutePath, bytes);
  return {
    mediaUrl: `/uploads/${fileName}`,
    previewUrl: `/uploads/${fileName}`,
    mimeType: file.type || "application/octet-stream",
    originalFileName: file.name,
    sizeBytes: file.size
  };
}

export async function removeUploadedFile(publicPath: string) {
  const bucket = await getBucket();
  if (bucket && publicPath.includes("/media/")) {
    const key = publicPath.split("/media/")[1];
    if (key) {
      await bucket.delete(key);
    }
    return;
  }
  if (!publicPath.startsWith("/uploads/")) {
    return;
  }
  const absolutePath = path.join(process.cwd(), "public", publicPath.replace(/^\//, ""));
  try {
    await fs.unlink(absolutePath);
  } catch {
    // File may already be removed in dev mode; ignore.
  }
}

function localFileNameForObjectKey(objectKey: string) {
  return objectKey.replace(/[^\w.\-]+/g, "_");
}

function partPath(uploadId: string, partNumber: number) {
  return path.join(uploadSessionDir, uploadId, `part-${String(partNumber).padStart(5, "0")}`);
}

export async function saveUploadPart(session: UploadSession, partNumber: number, bytes: Buffer) {
  const bucket = await getBucket();
  if (bucket && session.storageUploadId) {
    const multipart = bucket.resumeMultipartUpload(session.objectKey, session.storageUploadId);
    const part = await multipart.uploadPart(partNumber, bytes);
    return {
      etag: part.etag,
      sizeBytes: bytes.byteLength
    };
  }

  const dir = path.join(uploadSessionDir, session.id);
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(partPath(session.id, partNumber), bytes);
  return {
    etag: crypto.createHash("sha1").update(bytes).digest("hex"),
    sizeBytes: bytes.byteLength
  };
}

export async function completeUploadedParts(session: UploadSession, parts: UploadPartRecord[]) {
  const bucket = await getBucket();
  const sortedParts = [...parts].sort((a, b) => a.partNumber - b.partNumber);
  if (bucket && session.storageUploadId) {
    const multipart = bucket.resumeMultipartUpload(session.objectKey, session.storageUploadId);
    const object = await multipart.complete(
      sortedParts.map((part) => ({
        partNumber: part.partNumber,
        etag: part.etag
      }))
    );
    const headers = new Headers();
    object.writeHttpMetadata(headers);
    const url = await publicUrlForKey(session.objectKey);
    return {
      mediaUrl: url,
      previewUrl: url,
      mimeType: session.mimeType,
      originalFileName: session.fileName,
      sizeBytes: session.sizeBytes
    };
  }

  await fs.mkdir(uploadDir, { recursive: true });
  const fileName = localFileNameForObjectKey(session.objectKey);
  const absolutePath = path.join(uploadDir, fileName);
  const handle = await fs.open(absolutePath, "w");

  try {
    for (const part of sortedParts) {
      const bytes = await fs.readFile(partPath(session.id, part.partNumber));
      await handle.write(bytes);
    }
  } finally {
    await handle.close();
  }

  await fs.rm(path.join(uploadSessionDir, session.id), { recursive: true, force: true });
  return {
    mediaUrl: `/uploads/${fileName}`,
    previewUrl: `/uploads/${fileName}`,
    mimeType: session.mimeType,
    originalFileName: session.fileName,
    sizeBytes: session.sizeBytes
  };
}

export async function abortUploadedParts(session: UploadSession) {
  const bucket = await getBucket();
  if (bucket && session.storageUploadId) {
    await bucket.resumeMultipartUpload(session.objectKey, session.storageUploadId).abort();
    return;
  }
  await fs.rm(path.join(uploadSessionDir, session.id), { recursive: true, force: true });
}
