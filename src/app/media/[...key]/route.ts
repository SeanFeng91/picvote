import { NextResponse } from "next/server";

import { getMediaBucket } from "@/lib/cloudflare";

type R2ObjectBody = {
  body: BodyInit | null;
  httpMetadata?: {
    contentType?: string;
    cacheControl?: string;
  };
};

type R2BucketLike = {
  get(key: string): Promise<R2ObjectBody | null>;
};

export async function GET(_: Request, { params }: { params: Promise<{ key: string[] }> }) {
  const { key } = await params;
  const bucket = (await getMediaBucket()) as R2BucketLike | null;
  if (!bucket) {
    return NextResponse.json({ error: "媒体存储未配置" }, { status: 404 });
  }
  const objectKey = key.join("/");
  const object = await bucket.get(objectKey);
  if (!object?.body) {
    return NextResponse.json({ error: "文件不存在" }, { status: 404 });
  }
  const headers = new Headers();
  if (object.httpMetadata?.contentType) {
    headers.set("content-type", object.httpMetadata.contentType);
  }
  headers.set("cache-control", object.httpMetadata?.cacheControl || "public, max-age=31536000, immutable");
  return new Response(object.body, { headers });
}
