import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth";
import { getWorkForUser, remainingVotesForUser } from "@/lib/store";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }
  const [currentWork, remainingVotes] = await Promise.all([getWorkForUser(user.id), remainingVotesForUser(user.id)]);
  return NextResponse.json({
    user,
    currentWork,
    remainingVotes
  });
}
