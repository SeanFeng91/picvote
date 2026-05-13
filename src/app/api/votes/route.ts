import { NextResponse } from "next/server";
import { z } from "zod";

import { getCurrentUser } from "@/lib/auth";
import { castVotes } from "@/lib/store";

const schema = z.object({
  workId: z.string().min(1),
  count: z.number().int().min(1).max(20)
});

export async function POST(request: Request) {
  const user = getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }
  const body = schema.parse(await request.json());
  try {
    const payload = castVotes({ voter: user, workId: body.workId, count: body.count });
    return NextResponse.json(payload);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "投票失败" }, { status: 400 });
  }
}
