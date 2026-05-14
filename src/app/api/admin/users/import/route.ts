import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth";
import { createUser, getUserByEmployeeNo, updateUserConfig } from "@/lib/store";

function parseBoolean(value: string | undefined, fallback: boolean) {
  if (!value) {
    return fallback;
  }
  return ["1", "true", "yes", "y", "允许", "是"].includes(value.trim().toLowerCase());
}

function parseCsv(text: string) {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => line.split(",").map((cell) => cell.trim()));
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") {
    return NextResponse.json({ error: "没有权限" }, { status: 403 });
  }

  try {
    const { csv } = (await request.json()) as { csv?: string };
    if (!csv?.trim()) {
      return NextResponse.json({ error: "请粘贴 CSV 内容" }, { status: 400 });
    }

    const rows = parseCsv(csv);
    const dataRows = rows[0]?.[0]?.includes("工号") || rows[0]?.[0] === "employeeNo" ? rows.slice(1) : rows;
    let created = 0;
    let updated = 0;

    for (const row of dataRows) {
      const [employeeNo, displayName, accessCode, voteQuota, canUpload, canVote] = row;
      if (!employeeNo || !displayName) {
        continue;
      }
      const existing = await getUserByEmployeeNo(employeeNo);
      const patch = {
        displayName,
        voteQuota: voteQuota ? Number(voteQuota) : null,
        canUpload: parseBoolean(canUpload, true),
        canVote: parseBoolean(canVote, true)
      };
      if (existing) {
        await updateUserConfig(existing.id, patch);
        updated += 1;
      } else {
        await createUser({
          employeeNo,
          accessCode: accessCode || "demo123",
          ...patch
        });
        created += 1;
      }
    }

    return NextResponse.json({ ok: true, created, updated });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "导入失败" }, { status: 400 });
  }
}
