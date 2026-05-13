import { NextResponse } from "next/server";
import { z } from "zod";

import { getCurrentUser } from "@/lib/auth";
import { updateActivityConfig } from "@/lib/store";

const schema = z.object({
  status: z.enum(["draft", "uploading", "voting", "closed", "published"]).optional(),
  allowSelfVote: z.boolean().optional(),
  showPublicVotes: z.boolean().optional()
});

export async function PATCH(request: Request) {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") {
    return NextResponse.json({ error: "没有权限" }, { status: 403 });
  }
  const payload = schema.parse(await request.json());
  return NextResponse.json({ ok: true, activity: updateActivityConfig(payload) });
}
