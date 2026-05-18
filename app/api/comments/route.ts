import { NextResponse } from "next/server";
import { createComment } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "请先登录" }, { status: 401 });
    }

    const { sessionId, content } = await request.json();
    if (!sessionId || !content?.trim()) {
      return NextResponse.json({ error: "请填写留言内容" }, { status: 400 });
    }

    createComment(user.id, sessionId, content.trim());
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Comment error:", error);
    return NextResponse.json({ error: "留言失败" }, { status: 500 });
  }
}
