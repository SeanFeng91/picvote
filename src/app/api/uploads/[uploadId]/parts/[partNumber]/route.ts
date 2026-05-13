import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth";
import { recordUploadPart } from "@/lib/store";
import { saveUploadPart } from "@/lib/storage";

export const runtime = "nodejs";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ uploadId: string; partNumber: string }> }
) {
  const { uploadId, partNumber: partNumberParam } = await params;
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  const partNumber = Number(partNumberParam);
  if (!Number.isInteger(partNumber) || partNumber < 1) {
    return NextResponse.json({ error: "分片编号无效" }, { status: 400 });
  }

  try {
    const bytes = Buffer.from(await request.arrayBuffer());
    const saved = await saveUploadPart(uploadId, partNumber, bytes);
    const session = recordUploadPart({
      actor: user,
      uploadId,
      partNumber,
      etag: saved.etag,
      sizeBytes: saved.sizeBytes
    });
    const part = session.parts.find((item) => item.partNumber === partNumber);
    return NextResponse.json({ ok: true, partNumber, etag: saved.etag, part, uploadedParts: session.parts });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "分片上传失败" }, { status: 400 });
  }
}
