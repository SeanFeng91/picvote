import { MediaType } from "@/lib/types";

export const IMAGE_MAX_BYTES = 30 * 1024 * 1024;
export const VIDEO_MAX_BYTES = 300 * 1024 * 1024;
export const UPLOAD_PART_SIZE = 10 * 1024 * 1024;
export const UPLOAD_CONCURRENCY = 3;
export const UPLOAD_RETRY_LIMIT = 3;

export function inferMediaTypeFromMime(mimeType: string): MediaType {
  return mimeType.startsWith("video/") ? "video" : "image";
}

export function validateUploadFile(input: { mimeType: string; sizeBytes: number }) {
  if (!input.mimeType.startsWith("image/") && !input.mimeType.startsWith("video/")) {
    throw new Error("仅支持图片或视频");
  }

  if (input.mimeType.startsWith("image/") && input.sizeBytes > IMAGE_MAX_BYTES) {
    throw new Error("图片请控制在 30MB 内");
  }

  if (input.mimeType.startsWith("video/") && input.sizeBytes > VIDEO_MAX_BYTES) {
    throw new Error("视频请控制在 300MB 内");
  }
}
