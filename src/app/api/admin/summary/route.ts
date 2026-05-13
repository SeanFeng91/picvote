import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth";
import { getAdminSummary } from "@/lib/store";

export async function GET() {
  const user = getCurrentUser();
  if (!user || user.role !== "admin") {
    return NextResponse.json({ error: "没有权限" }, { status: 403 });
  }
  return NextResponse.json(getAdminSummary());
}
