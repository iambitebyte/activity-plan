import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getUploadByMd5AndSession, createUpload } from "@/lib/db";
import { computeMd5, generateStorageFilename, getFilePath, getMaxFileSize } from "@/lib/upload";
import fs from "fs";

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "请先登录" }, { status: 401 });
    }

    const formData = await request.formData();
    const sessionId = formData.get("sessionId") as string;
    const file = formData.get("file") as File | null;

    if (!sessionId) {
      return NextResponse.json({ error: "缺少活动ID" }, { status: 400 });
    }
    if (!file) {
      return NextResponse.json({ error: "请选择文件" }, { status: 400 });
    }

    if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
      return NextResponse.json({ error: "仅支持PDF文件" }, { status: 400 });
    }

    if (file.size > getMaxFileSize()) {
      return NextResponse.json({ error: "文件大小不能超过10MB" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const md5 = computeMd5(buffer);

    const existing = getUploadByMd5AndSession(md5, sessionId);
    let filename: string;

    if (existing) {
      filename = existing.filename;
    } else {
      filename = generateStorageFilename(file.name);
      fs.writeFileSync(getFilePath(filename), buffer);
    }

    createUpload(user.id, sessionId, filename, file.name, md5, file.size);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json({ error: "上传失败" }, { status: 500 });
  }
}
