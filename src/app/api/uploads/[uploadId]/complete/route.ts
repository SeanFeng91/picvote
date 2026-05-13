import { NextResponse } from "next/server";
import { z } from "zod";

import { getCurrentUser } from "@/lib/auth";
import { completeUploadSession, getUploadSession } from "@/lib/store";
import { completeUploadedParts } from "@/lib/storage";

export const runtime = "nodejs";

const schema = z.object({
  parts: z
    .array(
      z.object({
        partNumber: z.number().int().positive(),
        etag: z.string().min(1),
        sizeBytes: z.number().int().positive(),
        uploadedAt: z.string().optional()
      })
    )
    .optional()
});

export async function POST(request: Request, { params }: { params: Promise<{ uploadId: string }> }) {
  const { uploadId } = await params;
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  try {
    const payload = schema.parse(await request.json().catch(() => ({})));
    const session = getUploadSession(uploadId);
    if (!session || session.ownerUserId !== user.id) {
      return NextResponse.json({ error: "上传会话不存在" }, { status: 404 });
    }
    const parts = (payload.parts?.length ? payload.parts : session.parts).map((part) => ({
      ...part,
      uploadedAt: part.uploadedAt ?? new Date().toISOString()
    }));
    const saved = await completeUploadedParts(session, parts);
    const completed = completeUploadSession({
      actor: user,
      uploadId,
      mediaUrl: saved.mediaUrl,
      previewUrl: saved.previewUrl,
      parts
    });
    return NextResponse.json({ ok: true, uploadSession: completed.session, work: completed.work });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "完成上传失败" }, { status: 400 });
  }
}
