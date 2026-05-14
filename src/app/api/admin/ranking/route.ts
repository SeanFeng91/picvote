import { NextResponse } from "next/server";

import { getActivity, listWorks } from "@/lib/store";

export async function GET() {
  const [works, activity] = await Promise.all([listWorks(false), getActivity()]);
  return NextResponse.json({ works, showPublicVotes: activity.showPublicVotes });
}
