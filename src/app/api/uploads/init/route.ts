import { NextResponse } from "next/server";
import { z } from "zod";

import { getCurrentUser } from "@/lib/auth";
import { createUploadSession, failUploadSession, setUploadSessionStorageUploadId } from "@/lib/store";
import { createStorageMultipartUpload } from "@/lib/storage";

const schema = z.object({
  title: z.string().default(""),
  fileName: z.string().min(1),
  mimeType: z.string().min(1),
  sizeBytes: z.number().int().positive()
});

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  try {
    const payload = schema.parse(await request.json());
    const createdSession = await createUploadSession({ owner: user, ...payload });
    let multipartUpload: Awaited<ReturnType<typeof createStorageMultipartUpload>> = null;
    try {
      multipartUpload = await createStorageMultipartUpload(createdSession.objectKey, createdSession.mimeType);
    } catch (error) {
      await failUploadSession(createdSession.id, error instanceof Error ? error.message : "R2 上传初始化失败");
      throw error;
    }
    const session = multipartUpload?.uploadId
      ? await setUploadSessionStorageUploadId(createdSession.id, multipartUpload.uploadId)
      : createdSession;
    return NextResponse.json({
      uploadId: session.id,
      workDraftId: session.workDraftId,
      objectKey: session.objectKey,
      partSize: session.partSize,
      totalParts: session.totalParts,
      maxParts: 10000,
      uploadedParts: session.parts
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "无法创建上传会话" }, { status: 400 });
  }
}
