import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth";
import { getUploadSession } from "@/lib/store";

export async function GET(_: Request, { params }: { params: Promise<{ uploadId: string }> }) {
  const { uploadId } = await params;
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  const session = getUploadSession(uploadId);
  if (!session || session.ownerUserId !== user.id) {
    return NextResponse.json({ error: "上传会话不存在" }, { status: 404 });
  }

  return NextResponse.json({
    uploadId: session.id,
    workDraftId: session.workDraftId,
    objectKey: session.objectKey,
    fileName: session.fileName,
    title: session.title,
    mediaType: session.mediaType,
    mimeType: session.mimeType,
    sizeBytes: session.sizeBytes,
    partSize: session.partSize,
    totalParts: session.totalParts,
    status: session.status,
    error: session.error,
    uploadedParts: session.parts
  });
}
