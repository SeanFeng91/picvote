import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth";
import { deleteWork } from "@/lib/store";
import { removeUploadedFile } from "@/lib/storage";

export const runtime = "nodejs";

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }
  try {
    const work = deleteWork({ actor: user, workId: id });
    await removeUploadedFile(work.mediaUrl);
    return NextResponse.json({ ok: true, work });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "删除失败" }, { status: 400 });
  }
}
