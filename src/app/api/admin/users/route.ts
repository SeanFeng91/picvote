import { NextResponse } from "next/server";
import { z } from "zod";

import { getCurrentUser } from "@/lib/auth";
import { createUser, listUsers } from "@/lib/store";

const createSchema = z.object({
  employeeNo: z.string().min(1),
  displayName: z.string().min(1),
  accessCode: z.string().min(1).default("demo123"),
  voteQuota: z.number().int().nullable().optional(),
  canUpload: z.boolean().default(true),
  canVote: z.boolean().default(true)
});

export async function GET() {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") {
    return NextResponse.json({ error: "没有权限" }, { status: 403 });
  }
  return NextResponse.json({ users: listUsers() });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") {
    return NextResponse.json({ error: "没有权限" }, { status: 403 });
  }
  try {
    const payload = createSchema.parse(await request.json());
    const created = createUser(payload);
    return NextResponse.json({ ok: true, user: created });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "创建失败" }, { status: 400 });
  }
}
