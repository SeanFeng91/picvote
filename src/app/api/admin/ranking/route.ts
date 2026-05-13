import { NextResponse } from "next/server";

import { getActivity, listWorks } from "@/lib/store";

export async function GET() {
  return NextResponse.json({ works: listWorks(false), showPublicVotes: getActivity().showPublicVotes });
}
