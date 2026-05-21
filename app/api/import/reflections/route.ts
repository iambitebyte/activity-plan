import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { importComment } from "@/lib/db";
import { getSessionById } from "@/lib/master-data";

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "请先登录" }, { status: 401 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "无效的 JSON 文件" }, { status: 400 });
  }

  const obj = body as Record<string, unknown>;
  if (obj.version !== 1 || obj.type !== "reflections" || !Array.isArray(obj.data)) {
    return NextResponse.json({ error: "文件格式不正确" }, { status: 400 });
  }

  let imported = 0;
  let skipped = 0;
  let invalid = 0;

  for (const item of obj.data as Record<string, unknown>[]) {
    if (!item.uuid || !item.session_id || !item.content) {
      invalid++;
      continue;
    }
    if (!getSessionById(item.session_id as string)) {
      invalid++;
      continue;
    }
    const result = importComment(
      user.id,
      item.session_id as string,
      item.content as string,
      item.uuid as string,
      (item.created_at as string) || new Date().toISOString()
    );
    if (result.success) {
      imported++;
    } else {
      skipped++;
    }
  }

  return NextResponse.json({ imported, skipped, invalid });
}
