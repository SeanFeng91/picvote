import crypto from "node:crypto";

import { cookies } from "next/headers";

import { getUserById } from "@/lib/store";
import { SessionPayload } from "@/lib/types";

const SESSION_COOKIE = "vivopicvote_session";

function secret() {
  return process.env.SESSION_SECRET || "vivopicvote-dev-secret";
}

function sign(value: string) {
  return crypto.createHmac("sha256", secret()).update(value).digest("base64url");
}

function encode(payload: SessionPayload) {
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${body}.${sign(body)}`;
}

function decode(token: string): SessionPayload | null {
  const [body, signature] = token.split(".");
  if (!body || !signature || sign(body) !== signature) {
    return null;
  }
  try {
    return JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as SessionPayload;
  } catch {
    return null;
  }
}

function isSecureRequest(request: Request) {
  const forwardedProto = request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim();
  if (forwardedProto) {
    return forwardedProto === "https";
  }

  return new URL(request.url).protocol === "https:";
}

/**
 * Build cookie options (shared between cookies() and NextResponse.cookies approaches)
 */
export function buildSessionCookie(payload: SessionPayload, request: Request) {
  const token = encode(payload);
  const secure = isSecureRequest(request);
  return {
    name: SESSION_COOKIE,
    value: token,
    options: {
      httpOnly: true,
      sameSite: "lax" as const,
      path: "/",
      secure,
      maxAge: 60 * 60 * 24 * 3
    }
  };
}

export async function setSessionCookie(payload: SessionPayload, request: Request) {
  const cookieStore = await cookies();
  const { name, value, options } = buildSessionCookie(payload, request);
  cookieStore.set(name, value, options);
}

export async function clearSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}

export async function getSessionPayload() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) {
    return null;
  }
  return decode(token);
}

export async function getCurrentUser() {
  const payload = await getSessionPayload();
  if (!payload) {
    return null;
  }
  return getUserById(payload.userId);
}
