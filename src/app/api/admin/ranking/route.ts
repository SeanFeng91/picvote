import { NextResponse } from "next/server";

import { listWorks } from "@/lib/store";

export async function GET() {
  return NextResponse.json({ works: listWorks(false) });
}
