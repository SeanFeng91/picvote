import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth";
import { abortUploadSession } from "@/lib/store";
import { abortUploadedParts } from "@/lib/storage";

export const runtime = "nodejs";

export async function POST(_: Request, { params }: { params: Promise<{ uploadId: string }> }) {
  const { uploadId } = await params;
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  try {
    const session = abortUploadSession({ actor: user, uploadId });
    await abortUploadedParts(uploadId);
    return NextResponse.json({ ok: true, uploadSession: session });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "取消上传失败" }, { status: 400 });
  }
}
