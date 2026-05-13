import { NextResponse } from "next/server";
import { z } from "zod";

import { getCurrentUser } from "@/lib/auth";
import { updateUserConfig } from "@/lib/store";

const patchSchema = z.object({
  displayName: z.string().min(1).optional(),
  canUpload: z.boolean().optional(),
  canVote: z.boolean().optional(),
  voteQuota: z.number().int().nullable().optional()
});

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const user = getCurrentUser();
  if (!user || user.role !== "admin") {
    return NextResponse.json({ error: "没有权限" }, { status: 403 });
  }
  try {
    const payload = patchSchema.parse(await request.json());
    const updated = updateUserConfig(params.id, payload);
    return NextResponse.json({ ok: true, user: updated });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "更新失败" }, { status: 400 });
  }
}
