import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth";
import { deleteWork } from "@/lib/store";
import { removeUploadedFile } from "@/lib/storage";

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  const user = getCurrentUser();
  if (!user || user.role !== "admin") {
    return NextResponse.json({ error: "没有权限" }, { status: 403 });
  }
  try {
    const work = deleteWork({ actor: user, workId: params.id, asAdmin: true });
    await removeUploadedFile(work.mediaUrl);
    return NextResponse.json({ ok: true, work });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "删除失败" }, { status: 400 });
  }
}
