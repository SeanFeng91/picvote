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

export function setSessionCookie(payload: SessionPayload) {
  cookies().set(SESSION_COOKIE, encode(payload), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 3
  });
}

export function clearSessionCookie() {
  cookies().delete(SESSION_COOKIE);
}

export function getSessionPayload() {
  const token = cookies().get(SESSION_COOKIE)?.value;
  if (!token) {
    return null;
  }
  return decode(token);
}

export function getCurrentUser() {
  const payload = getSessionPayload();
  if (!payload) {
    return null;
  }
  return getUserById(payload.userId);
}
