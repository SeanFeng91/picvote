import { NextResponse } from "next/server";
import { z } from "zod";

import { getCurrentUser } from "@/lib/auth";
import { deleteWork, updateWorkStatus } from "@/lib/store";
import { removeUploadedFile } from "@/lib/storage";

export const runtime = "nodejs";

const patchSchema = z.object({
  status: z.enum(["active", "hidden", "deleted", "rejected"])
});

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") {
    return NextResponse.json({ error: "没有权限" }, { status: 403 });
  }
  try {
    const payload = patchSchema.parse(await request.json());
    const work = updateWorkStatus(id, payload.status);
    return NextResponse.json({ ok: true, work });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "更新失败" }, { status: 400 });
  }
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") {
    return NextResponse.json({ error: "没有权限" }, { status: 403 });
  }
  try {
    const work = deleteWork({ actor: user, workId: id, asAdmin: true });
    await removeUploadedFile(work.mediaUrl);
    return NextResponse.json({ ok: true, work });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "删除失败" }, { status: 400 });
  }
}
