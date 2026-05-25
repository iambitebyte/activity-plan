import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getUploadById, deleteUpload } from "@/lib/db";
import { getFilePath } from "@/lib/upload";
import fs from "fs";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "请先登录" }, { status: 401 });
    }

    const { id } = await params;
    const upload = getUploadById(Number(id));
    if (!upload) {
      return NextResponse.json({ error: "文件不存在" }, { status: 404 });
    }

    const filePath = getFilePath(upload.filename);
    if (!fs.existsSync(filePath)) {
      return NextResponse.json({ error: "文件不存在" }, { status: 404 });
    }

    const buffer = fs.readFileSync(filePath);
    return new Response(buffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${encodeURIComponent(upload.original_name)}"`,
        "Content-Length": String(buffer.length),
      },
    });
  } catch (error) {
    console.error("Serve upload error:", error);
    return NextResponse.json({ error: "获取文件失败" }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "请先登录" }, { status: 401 });
    }

    const { id } = await params;
    const result = deleteUpload(Number(id), user.id);
    if (!result) {
      return NextResponse.json({ error: "文件不存在或无权删除" }, { status: 403 });
    }

    if (result.filename) {
      const filePath = getFilePath(result.filename);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete upload error:", error);
    return NextResponse.json({ error: "删除失败" }, { status: 500 });
  }
}
