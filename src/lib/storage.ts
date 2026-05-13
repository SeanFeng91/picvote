import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";

import { UploadPartRecord, UploadSession } from "@/lib/types";

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

export async function saveUploadedFile(file: File, workKey: string) {
  await fs.mkdir(uploadDir, { recursive: true });
  const ext = extensionFor(file);
  const fileName = `${workKey}.${ext}`;
  const absolutePath = path.join(uploadDir, fileName);
  const bytes = Buffer.from(await file.arrayBuffer());
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

export async function saveUploadPart(uploadId: string, partNumber: number, bytes: Buffer) {
  const dir = path.join(uploadSessionDir, uploadId);
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(partPath(uploadId, partNumber), bytes);
  return {
    etag: crypto.createHash("sha1").update(bytes).digest("hex"),
    sizeBytes: bytes.byteLength
  };
}

export async function completeUploadedParts(session: UploadSession, parts: UploadPartRecord[]) {
  await fs.mkdir(uploadDir, { recursive: true });
  const fileName = localFileNameForObjectKey(session.objectKey);
  const absolutePath = path.join(uploadDir, fileName);
  const handle = await fs.open(absolutePath, "w");

  try {
    for (const part of [...parts].sort((a, b) => a.partNumber - b.partNumber)) {
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

export async function abortUploadedParts(uploadId: string) {
  await fs.rm(path.join(uploadSessionDir, uploadId), { recursive: true, force: true });
}
