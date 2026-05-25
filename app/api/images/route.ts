import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createImage } from "@/lib/db";
import { computeMd5, generateStorageFilename, getFilePath, getMaxFileSize } from "@/lib/upload";
import fs from "fs";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"];

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
      return NextResponse.json({ error: "请选择图片" }, { status: 400 });
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json({ error: "仅支持 JPG、PNG、GIF、WebP 格式" }, { status: 400 });
    }

    if (file.size > getMaxFileSize()) {
      return NextResponse.json({ error: "图片大小不能超过20MB" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const md5 = computeMd5(buffer);
    const filename = generateStorageFilename(file.name);

    fs.writeFileSync(getFilePath(filename), buffer);
    createImage(user.id, sessionId, filename, file.name, md5, file.size, file.type);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Image upload error:", error);
    return NextResponse.json({ error: "上传失败" }, { status: 500 });
  }
}
