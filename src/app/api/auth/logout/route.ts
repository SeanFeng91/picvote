import { NextResponse } from "next/server";

const SESSION_COOKIE = "vivopicvote_session";

export async function POST() {
  const response = NextResponse.json({ ok: true });
  // Delete cookie directly on the response for maximum compatibility
  response.cookies.set(SESSION_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 0
  });
  return response;
}
