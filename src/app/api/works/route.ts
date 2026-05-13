import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth";
import { createWork, listWorks, remainingVotesForUser } from "@/lib/store";
import { saveUploadedFile } from "@/lib/storage";
import { validateUploadFile } from "@/lib/upload-limits";

function inferMediaType(file: File) {
  return file.type.startsWith("video/") ? "video" : "image";
}

export async function GET() {
  const user = getCurrentUser();
  return NextResponse.json({
    works: listWorks(false),
    remainingVotes: user ? remainingVotesForUser(user.id) : null
  });
}

export async function POST(request: Request) {
  const user = getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  const formData = await request.formData();
  const title = String(formData.get("title") || "");
  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "缺少上传文件" }, { status: 400 });
  }
  try {
    validateUploadFile({ mimeType: file.type, sizeBytes: file.size });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "文件不符合上传规则" }, { status: 400 });
  }

  const saved = await saveUploadedFile(file, `${user.employeeNo}-${Date.now()}`);
  try {
    const work = createWork({
      owner: user,
      title,
      mediaType: inferMediaType(file),
      mediaUrl: saved.mediaUrl,
      previewUrl: saved.previewUrl,
      mimeType: saved.mimeType,
      originalFileName: saved.originalFileName,
      sizeBytes: saved.sizeBytes
    });
    return NextResponse.json({ ok: true, work });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "上传失败" }, { status: 400 });
  }
}
