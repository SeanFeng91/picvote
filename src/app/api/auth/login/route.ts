import { NextResponse } from "next/server";
import { z } from "zod";

import { buildSessionCookie } from "@/lib/auth";
import { authenticate } from "@/lib/store";

const schema = z.object({
  employeeNo: z.string().min(1),
  accessCode: z.string().min(1),
  intent: z.enum(["user", "admin"]).default("user"),
  returnTo: z.string().optional()
});

export async function POST(request: Request) {
  const payload = schema.parse(await request.json());
  const user = await authenticate(payload.employeeNo, payload.accessCode);
  if (!user) {
    return NextResponse.json({ error: "工号或口令不正确" }, { status: 401 });
  }
  if (payload.intent === "admin" && user.role !== "admin") {
    return NextResponse.json({ error: "当前账号不是管理员" }, { status: 403 });
  }

  // Build response first, then set cookie directly on the response object
  // This is more reliable than cookies().set() in edge/worker runtimes
  const redirectTo = payload.returnTo || (user.role === "admin" ? "/admin" : "/");
  const response = NextResponse.json({ ok: true, redirectTo });
  const { name, value, options } = buildSessionCookie(
    { userId: user.id, role: user.role },
    request
  );
  response.cookies.set(name, value, options);
  return response;
}
