import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth";
import { getWorkForUser, remainingVotesForUser } from "@/lib/store";

export async function GET() {
  const user = getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }
  return NextResponse.json({
    user,
    currentWork: getWorkForUser(user.id),
    remainingVotes: remainingVotesForUser(user.id)
  });
}
